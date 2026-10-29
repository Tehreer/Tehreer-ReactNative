package com.tehreer.benchmark;

import android.app.Activity;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Debug;
import android.text.SpannableString;
import android.text.Spanned;
import android.util.Log;

import com.mta.tehreer.font.FontFile;
import com.mta.tehreer.graphics.Renderer;
import com.mta.tehreer.graphics.Typeface;
import com.mta.tehreer.layout.ComposedFrame;
import com.mta.tehreer.layout.FrameResolver;
import com.mta.tehreer.layout.Typesetter;
import com.mta.tehreer.layout.style.TypeSizeSpan;
import com.mta.tehreer.layout.style.TypefaceSpan;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The Tehreer-Android runner of benchmarks/scenarios.json (the steps are those of
 * example/benchmark/runBenchmark.ts and benchmarks/cocoa). It logs BENCH lines to logcat, tag
 * TehreerBench, and finishes with BENCH_DONE or BENCH_ERROR.
 */
public class BenchActivity extends Activity {
    private static final String TAG = "TehreerBench";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Thread thread = new Thread(this::run, "benchmark");
        thread.start();
    }

    private static void emit(String tag, JSONObject value) {
        // One call, one line; the summaries keep it far below logcat's limit of about 4000 bytes.
        Log.i(TAG, tag + " " + value.toString());
    }

    private void run() {
        try {
            runAll();
        } catch (Throwable error) {
            try {
                emit("BENCH_ERROR", new JSONObject().put("message", String.valueOf(error)));
            } catch (Exception ignored) {
                Log.e(TAG, "BENCH_ERROR {\"message\":\"unreportable\"}");
            }
        }
    }

    private String readAsset(String name) throws Exception {
        try (InputStream stream = getAssets().open(name);
             BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder builder = new StringBuilder();
            char[] buffer = new char[8192];
            int count;
            while ((count = reader.read(buffer)) > 0) {
                builder.append(buffer, 0, count);
            }
            return builder.toString();
        }
    }

    private static double[] memory() {
        double heapKB = Debug.getNativeHeapAllocatedSize() / 1024.0;
        double residentKB = 0;
        try (BufferedReader reader = new BufferedReader(new java.io.FileReader("/proc/self/statm"))) {
            String[] fields = reader.readLine().split(" ");
            residentKB = Long.parseLong(fields[1]) * 4096L / 1024.0;
        } catch (Exception ignored) {
            // Only the run level resident size is lost.
        }
        return new double[] { heapKB, residentKB };
    }

    /** Java heap in use after a collection, in kilobytes: Tehreer-Android keeps part of a layout there. */
    private static double managedKB() {
        for (int i = 0; i < 3; i++) {
            System.gc();
            System.runFinalization();
        }
        Runtime runtime = Runtime.getRuntime();
        return (runtime.totalMemory() - runtime.freeMemory()) / 1024.0;
    }

    private static JSONObject summarize(double[] samples) throws Exception {
        double[] sorted = samples.clone();
        Arrays.sort(sorted);
        int middle = sorted.length >> 1;
        double median = sorted.length % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
        return new JSONObject()
            .put("n", sorted.length)
            .put("min", sorted[0])
            .put("median", median)
            .put("p90", sorted[Math.min(sorted.length - 1, (int) Math.floor(sorted.length * 0.9))])
            .put("max", sorted[sorted.length - 1]);
    }

    /** The styled text of a scenario: the type size everywhere and the typeface of each segment. */
    private static SpannableString makeText(JSONObject scenario, Map<String, Typeface> faces) throws Exception {
        JSONArray segments = scenario.getJSONArray("segments");
        int repeat = scenario.getInt("repeat");
        StringBuilder builder = new StringBuilder();
        List<int[]> ranges = new ArrayList<>();
        List<String> fonts = new ArrayList<>();
        for (int i = 0; i < repeat; i++) {
            for (int j = 0; j < segments.length(); j++) {
                JSONObject segment = segments.getJSONObject(j);
                int start = builder.length();
                builder.append(segment.getString("text"));
                ranges.add(new int[] { start, builder.length() });
                fonts.add(segment.getString("font"));
            }
        }
        if (builder.length() != scenario.getInt("characters")) {
            throw new IllegalStateException(scenario.getString("id") + ": text has " + builder.length() + " characters");
        }

        SpannableString spanned = new SpannableString(builder.toString());
        float size = (float) scenario.getDouble("typeSize");
        for (int i = 0; i < ranges.size(); i++) {
            int[] range = ranges.get(i);
            spanned.setSpan(new TypefaceSpan(faces.get(fonts.get(i))), range[0], range[1], Spanned.SPAN_INCLUSIVE_INCLUSIVE);
            spanned.setSpan(new TypeSizeSpan(size), range[0], range[1], Spanned.SPAN_INCLUSIVE_INCLUSIVE);
        }
        return spanned;
    }

    private static ComposedFrame layout(JSONObject scenario, double frameHeight, Spanned text) throws Exception {
        Typesetter typesetter = new Typesetter(text);
        FrameResolver resolver = new FrameResolver();
        resolver.setTypesetter(typesetter);
        resolver.setFrameWidth((float) scenario.getDouble("width"));
        resolver.setFrameHeight((float) frameHeight);
        // The frame is as high as its lines (otherwise it is the box, and the canvas would be huge).
        resolver.setFitsVertically(true);
        return resolver.createFrame(0, text.length());
    }

    private void runAll() throws Exception {
        JSONObject file = new JSONObject(readAsset("scenarios.json"));
        JSONObject fontNames = file.getJSONObject("fonts");
        double frameHeight = file.getDouble("frameHeight");

        Map<String, Typeface> faces = new HashMap<>();
        List<FontFile> files = new ArrayList<>();
        AssetManager assets = getAssets();
        for (Iterator<String> keys = fontNames.keys(); keys.hasNext(); ) {
            String name = keys.next();
            FontFile fontFile = new FontFile(assets, "fonts/" + fontNames.getString(name));
            files.add(fontFile);
            faces.put(name, fontFile.getTypefaces().get(0));
        }

        double[] start = memory();
        boolean debuggable = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        emit("BENCH_META", new JSONObject()
            .put("wrapper", "tehreer-android")
            .put("platform", "android")
            .put("osVersion", String.valueOf(Build.VERSION.SDK_INT))
            .put("build", debuggable ? "Debug" : "Release")
            .put("coreVersion", "Core (tehreer-core of Tehreer-Android)")
            .put("device", Build.MODEL)
            .put("renderScale", 1)
            .put("residentKBStart", start[1])
            .put("heapKBStart", start[0]));

        JSONArray scenarios = file.getJSONArray("scenarios");
        for (int s = 0; s < scenarios.length(); s++) {
            emit("BENCH_RESULT", runScenario(scenarios.getJSONObject(s), faces, frameHeight));
            Thread.sleep(50);
        }

        double[] end = memory();
        emit("BENCH_DONE", new JSONObject().put("residentKBEnd", end[1]).put("heapKBEnd", end[0]));
    }

    private JSONObject runScenario(JSONObject scenario, Map<String, Typeface> faces, double frameHeight) throws Exception {
        // Memory first: native heap in use with a typesetter and a frame alive, minus before the text
        // existed; three times, the median is the number.
        // memLayoutKB is the native heap plus the Java heap (after a collection), because this wrapper
        // keeps its layout in both; the two parts are reported as well.
        double[] memSamples = new double[3];
        double[] nativeSamples = new double[3];
        double[] managedSamples = new double[3];
        for (int i = 0; i < 3; i++) {
            double beforeManaged = managedKB();
            double beforeNative = memory()[0];
            SpannableString text = makeText(scenario, faces);
            ComposedFrame frame = layout(scenario, frameHeight, text);
            double afterManaged = managedKB();
            double afterNative = memory()[0];
            nativeSamples[i] = afterNative - beforeNative;
            managedSamples[i] = afterManaged - beforeManaged;
            memSamples[i] = nativeSamples[i] + managedSamples[i];
            if (frame.getLines().isEmpty() || text.length() == 0) {
                throw new IllegalStateException("no lines");
            }
        }

        JSONObject layoutCounts = scenario.getJSONObject("layout");
        int layoutWarmup = layoutCounts.getInt("warmup");
        int layoutIterations = layoutCounts.getInt("iterations");
        double[] layoutMs = new double[layoutIterations];
        SpannableString text = makeText(scenario, faces);
        ComposedFrame kept = null;
        for (int i = 0; i < layoutWarmup + layoutIterations; i++) {
            long begin = System.nanoTime();
            ComposedFrame frame = layout(scenario, frameHeight, text);
            long elapsed = System.nanoTime() - begin;
            if (i >= layoutWarmup) {
                layoutMs[i - layoutWarmup] = elapsed / 1e6;
            }
            if (kept == null) {
                kept = frame;
            }
        }

        int width = (int) Math.ceil(scenario.getDouble("width"));
        int height = (int) Math.ceil(kept.getHeight());
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        canvas.drawColor(Color.WHITE);
        Renderer renderer = new Renderer();
        renderer.setTypeface(faces.get(scenario.getJSONArray("segments").getJSONObject(0).getString("font")));
        renderer.setTypeSize((float) scenario.getDouble("typeSize"));
        renderer.setForegroundColor(Color.BLACK);
        renderer.setRenderScale(1);

        JSONObject drawCounts = scenario.getJSONObject("draw");
        int drawWarmup = drawCounts.getInt("warmup");
        int drawIterations = drawCounts.getInt("iterations");
        double[] drawMs = new double[drawIterations];
        for (int i = 0; i < drawWarmup + drawIterations; i++) {
            long begin = System.nanoTime();
            kept.draw(renderer, canvas, 0, 0);
            long elapsed = System.nanoTime() - begin;
            if (i >= drawWarmup) {
                drawMs[i - drawWarmup] = elapsed / 1e6;
            }
        }
        bitmap.recycle();

        return new JSONObject()
            .put("scenario", scenario.getString("id"))
            .put("characters", scenario.getInt("characters"))
            .put("lines", kept.getLines().size())
            .put("frameWidth", kept.getWidth())
            .put("frameHeight", kept.getHeight())
            .put("layoutMs", summarize(layoutMs))
            .put("drawMs", summarize(drawMs))
            .put("memLayoutKB", summarize(memSamples))
            .put("memLayoutNativeKB", summarize(nativeSamples))
            .put("memLayoutManagedKB", summarize(managedSamples));
    }
}
