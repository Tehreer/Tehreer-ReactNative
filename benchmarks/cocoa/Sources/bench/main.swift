import CoreGraphics
import Darwin
import Foundation
import TehreerCocoa
import UIKit

// The Tehreer-Cocoa runner of benchmarks/scenarios.json (the steps are those of
// example/benchmark/runBenchmark.ts and benchmarks/android). Usage:
//   bench <scenarios.json> <fonts directory> <build label> <os label>
// It prints BENCH lines to standard output and finishes with BENCH_DONE or BENCH_ERROR.

func emit(_ tag: String, _ value: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    print("\(tag) \(String(data: data, encoding: .utf8)!)")
    fflush(stdout)
}

struct Failure: Error { let message: String }

func nowMs() -> Double {
    Double(clock_gettime_nsec_np(CLOCK_UPTIME_RAW)) / 1e6
}

/// Native heap in use (malloc zones) and resident size, in kilobytes.
func memory() -> (heapKB: Double, residentKB: Double) {
    var statistics = malloc_statistics_t()
    malloc_zone_statistics(nil, &statistics)
    var info = task_vm_info_data_t()
    var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<integer_t>.size)
    let result = withUnsafeMutablePointer(to: &info) {
        $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
            task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
        }
    }
    let resident = result == KERN_SUCCESS ? Double(info.resident_size) / 1024 : 0
    return (Double(statistics.size_in_use) / 1024, resident)
}

func summarize(_ samples: [Double]) -> [String: Any] {
    let sorted = samples.sorted()
    let middle = sorted.count / 2
    let median = sorted.count % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
    return [
        "n": sorted.count, "min": sorted[0], "median": median,
        "p90": sorted[min(sorted.count - 1, Int(floor(Double(sorted.count) * 0.9)))], "max": sorted[sorted.count - 1],
    ]
}

struct Segment { let font: String; let text: String }
struct Counts { let warmup: Int; let iterations: Int }
struct Scenario {
    let id: String
    let segments: [Segment]
    let repeatCount: Int
    let characters: Int
    let typeSize: CGFloat
    let width: CGFloat
    let layout: Counts
    let draw: Counts
}

func counts(_ object: Any?) -> Counts {
    let dictionary = object as! [String: Any]
    return Counts(warmup: dictionary["warmup"] as! Int, iterations: dictionary["iterations"] as! Int)
}

/// The styled text of a scenario: the type size everywhere and the typeface of each segment.
func makeText(_ scenario: Scenario, _ faces: [String: Typeface]) throws -> NSAttributedString {
    let text = NSMutableAttributedString()
    for _ in 0 ..< scenario.repeatCount {
        for segment in scenario.segments {
            text.append(NSAttributedString(string: segment.text, attributes: [
                .typeface: faces[segment.font]!, .typeSize: scenario.typeSize,
            ]))
        }
    }
    if text.length != scenario.characters {
        throw Failure(message: "\(scenario.id): text has \(text.length) characters")
    }
    return text
}

func layout(_ scenario: Scenario, _ frameHeight: CGFloat, _ text: NSAttributedString, _ defaults: [NSAttributedString.Key: Any]) -> ComposedFrame {
    let typesetter = Typesetter(text: text, defaultAttributes: defaults)
    let resolver = FrameResolver()
    resolver.typesetter = typesetter
    resolver.frameWidth = scenario.width
    resolver.frameHeight = frameHeight
    // The frame is as high as its lines (otherwise it is the box, and the canvas would be huge).
    resolver.fitsVertically = true
    return resolver.makeFrame(codeUnitRange: 0 ..< text.length)!
}

func runScenario(_ scenario: Scenario, _ faces: [String: Typeface], _ frameHeight: CGFloat) throws -> [String: Any] {
    let first = faces[scenario.segments[0].font]!
    let defaults: [NSAttributedString.Key: Any] = [.typeface: first, .typeSize: scenario.typeSize]

    // Memory first: native heap in use with a typesetter and a frame alive, minus before the text
    // existed; three times, the median is the number.
    var memSamples: [Double] = []
    for _ in 0 ..< 3 {
        let before = memory().heapKB
        var frame: ComposedFrame? = nil
        autoreleasepool {
            let text = try! makeText(scenario, faces)
            frame = layout(scenario, frameHeight, text, defaults)
        }
        let after = memory().heapKB
        memSamples.append(after - before)
        if frame!.lines.count == 0 { throw Failure(message: "no lines") }
        frame = nil
    }

    let text = try makeText(scenario, faces)
    var layoutMs: [Double] = []
    var kept: ComposedFrame? = nil
    for i in 0 ..< scenario.layout.warmup + scenario.layout.iterations {
        autoreleasepool {
            let start = nowMs()
            let frame = layout(scenario, frameHeight, text, defaults)
            let elapsed = nowMs() - start
            if i >= scenario.layout.warmup { layoutMs.append(elapsed) }
            if kept == nil { kept = frame }
        }
    }
    let frame = kept!

    // A bitmap context turned the way UIKit hands one to drawRect: (y down, in points), scale 1.
    let pixelWidth = Int(ceil(scenario.width))
    let pixelHeight = Int(ceil(frame.height))
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let context = CGContext(data: nil, width: pixelWidth, height: pixelHeight, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) else {
        throw Failure(message: "could not make the canvas")
    }
    context.setFillColor(UIColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: pixelWidth, height: pixelHeight))
    context.translateBy(x: 0, y: CGFloat(pixelHeight))
    context.scaleBy(x: 1, y: -1)

    let renderer = Renderer()
    renderer.typeface = first
    renderer.typeSize = scenario.typeSize
    renderer.renderScale = 1
    renderer.foregroundColor = .black

    var drawMs: [Double] = []
    for i in 0 ..< scenario.draw.warmup + scenario.draw.iterations {
        let start = nowMs()
        frame.draw(with: renderer, in: context, at: .zero)
        let elapsed = nowMs() - start
        if i >= scenario.draw.warmup { drawMs.append(elapsed) }
    }

    return [
        "scenario": scenario.id, "characters": scenario.characters, "lines": frame.lines.count,
        "frameWidth": Double(frame.width), "frameHeight": Double(frame.height),
        "layoutMs": summarize(layoutMs), "drawMs": summarize(drawMs), "memLayoutKB": summarize(memSamples),
    ]
}

func runAll() throws {
    let arguments = CommandLine.arguments
    guard arguments.count >= 5 else { throw Failure(message: "usage: bench <scenarios.json> <fonts directory> <build> <os>") }
    let file = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: arguments[1]))) as! [String: Any]
    let fontNames = file["fonts"] as! [String: String]
    let frameHeight = CGFloat(file["frameHeight"] as! Double)

    var faces: [String: Typeface] = [:]
    var files: [FontFile] = []
    for (name, fileName) in fontNames {
        guard let fontFile = FontFile(path: "\(arguments[2])/\(fileName)") else { throw Failure(message: "cannot read \(fileName)") }
        files.append(fontFile)
        faces[name] = fontFile.typefaces[0]
    }

    let scenarios: [Scenario] = (file["scenarios"] as! [[String: Any]]).map { item in
        Scenario(
            id: item["id"] as! String,
            segments: (item["segments"] as! [[String: String]]).map { Segment(font: $0["font"]!, text: $0["text"]!) },
            repeatCount: item["repeat"] as! Int, characters: item["characters"] as! Int,
            typeSize: CGFloat(item["typeSize"] as! Double), width: CGFloat(item["width"] as! Double),
            layout: counts(item["layout"]), draw: counts(item["draw"]))
    }

    let start = memory()
    emit("BENCH_META", [
        "wrapper": "tehreer-cocoa", "platform": "ios", "osVersion": arguments[4], "build": arguments[3],
        "coreVersion": "Core (Libraries/TehreerCore of Tehreer-Cocoa)", "renderScale": 1,
        "residentKBStart": start.residentKB, "heapKBStart": start.heapKB,
    ])
    for scenario in scenarios {
        emit("BENCH_RESULT", try runScenario(scenario, faces, frameHeight))
    }
    let end = memory()
    emit("BENCH_DONE", ["residentKBEnd": end.residentKB, "heapKBEnd": end.heapKB])
    withExtendedLifetime(files) {}
}

do {
    try runAll()
} catch let error as Failure {
    emit("BENCH_ERROR", ["message": error.message])
    exit(1)
} catch {
    emit("BENCH_ERROR", ["message": String(describing: error)])
    exit(1)
}
