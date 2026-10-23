#include "JniSupport.h"

#include <mutex>

namespace tehreer::android {
namespace {

JavaVM *gVm = nullptr;
Jni gJni;
bool gReady = false;
std::once_flag gOnce;

jclass FindGlobalClass(JNIEnv *env, const char *name) {
    jclass local = env->FindClass(name);
    if (local == nullptr) {
        return nullptr;
    }
    jclass global = static_cast<jclass>(env->NewGlobalRef(local));
    env->DeleteLocalRef(local);
    return global;
}

jobject StaticObject(JNIEnv *env, jclass type, const char *field, const char *signature) {
    jfieldID id = env->GetStaticFieldID(type, field, signature);
    if (id == nullptr) {
        return nullptr;
    }
    jobject local = env->GetStaticObjectField(type, id);
    if (local == nullptr) {
        return nullptr;
    }
    jobject global = env->NewGlobalRef(local);
    env->DeleteLocalRef(local);
    return global;
}

bool Load(JNIEnv *env) {
    Jni &j = gJni;
    j.bitmap = FindGlobalClass(env, "android/graphics/Bitmap");
    j.canvas = FindGlobalClass(env, "android/graphics/Canvas");
    j.paint = FindGlobalClass(env, "android/graphics/Paint");
    j.rectF = FindGlobalClass(env, "android/graphics/RectF");
    j.rect = FindGlobalClass(env, "android/graphics/Rect");
    j.blurFilter = FindGlobalClass(env, "android/graphics/BlurMaskFilter");
    jclass config = env->FindClass("android/graphics/Bitmap$Config");
    jclass blur = env->FindClass("android/graphics/BlurMaskFilter$Blur");
    if (!j.bitmap || !j.canvas || !j.paint || !j.rectF || !j.rect || !j.blurFilter || !config || !blur) {
        return false;
    }

    j.createBitmap = env->GetStaticMethodID(j.bitmap, "createBitmap", "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");
    j.eraseColor = env->GetMethodID(j.bitmap, "eraseColor", "(I)V");
    j.recycle = env->GetMethodID(j.bitmap, "recycle", "()V");
    j.extractAlpha = env->GetMethodID(j.bitmap, "extractAlpha", "(Landroid/graphics/Paint;[I)Landroid/graphics/Bitmap;");

    j.canvasInit = env->GetMethodID(j.canvas, "<init>", "(Landroid/graphics/Bitmap;)V");
    j.drawBitmapRects = env->GetMethodID(j.canvas, "drawBitmap",
        "(Landroid/graphics/Bitmap;Landroid/graphics/Rect;Landroid/graphics/RectF;Landroid/graphics/Paint;)V");
    j.drawBitmapAt = env->GetMethodID(j.canvas, "drawBitmap", "(Landroid/graphics/Bitmap;FFLandroid/graphics/Paint;)V");
    j.drawRect = env->GetMethodID(j.canvas, "drawRect", "(FFFFLandroid/graphics/Paint;)V");
    j.drawColor = env->GetMethodID(j.canvas, "drawColor", "(I)V");
    j.save = env->GetMethodID(j.canvas, "save", "()I");
    j.restore = env->GetMethodID(j.canvas, "restore", "()V");
    j.clipRect = env->GetMethodID(j.canvas, "clipRect", "(FFFF)Z");
    j.translate = env->GetMethodID(j.canvas, "translate", "(FF)V");
    j.getClipBounds = env->GetMethodID(j.canvas, "getClipBounds", "(Landroid/graphics/Rect;)Z");

    j.paintInit = env->GetMethodID(j.paint, "<init>", "()V");
    j.setColor = env->GetMethodID(j.paint, "setColor", "(I)V");
    j.setFilterBitmap = env->GetMethodID(j.paint, "setFilterBitmap", "(Z)V");
    j.setMaskFilter = env->GetMethodID(j.paint, "setMaskFilter", "(Landroid/graphics/MaskFilter;)Landroid/graphics/MaskFilter;");
    j.rectFInit = env->GetMethodID(j.rectF, "<init>", "()V");
    j.rectFSet = env->GetMethodID(j.rectF, "set", "(FFFF)V");
    j.rectInit = env->GetMethodID(j.rect, "<init>", "()V");
    j.blurFilterInit = env->GetMethodID(j.blurFilter, "<init>", "(FLandroid/graphics/BlurMaskFilter$Blur;)V");

    j.rectLeft = env->GetFieldID(j.rect, "left", "I");
    j.rectTop = env->GetFieldID(j.rect, "top", "I");
    j.rectRight = env->GetFieldID(j.rect, "right", "I");
    j.rectBottom = env->GetFieldID(j.rect, "bottom", "I");

    j.alpha8 = StaticObject(env, config, "ALPHA_8", "Landroid/graphics/Bitmap$Config;");
    j.argb8888 = StaticObject(env, config, "ARGB_8888", "Landroid/graphics/Bitmap$Config;");
    j.blurNormal = StaticObject(env, blur, "NORMAL", "Landroid/graphics/BlurMaskFilter$Blur;");
    env->DeleteLocalRef(config);
    env->DeleteLocalRef(blur);

    return !env->ExceptionCheck() && j.createBitmap && j.eraseColor && j.recycle && j.extractAlpha && j.canvasInit
        && j.drawBitmapRects && j.drawBitmapAt && j.drawRect && j.drawColor && j.save && j.restore && j.clipRect
        && j.translate && j.getClipBounds && j.paintInit && j.setColor && j.setFilterBitmap && j.setMaskFilter
        && j.rectFInit && j.rectFSet && j.rectInit && j.blurFilterInit && j.rectLeft && j.rectTop && j.rectRight
        && j.rectBottom && j.alpha8 && j.argb8888 && j.blurNormal;
}

} // namespace

const Jni *GetJni(JNIEnv *env) {
    std::call_once(gOnce, [env] {
        env->GetJavaVM(&gVm);
        gReady = Load(env);
        if (!gReady) {
            ClearException(env);
        }
    });
    return gReady ? &gJni : nullptr;
}

bool ClearException(JNIEnv *env) {
    if (env->ExceptionCheck()) {
        env->ExceptionClear();
        return true;
    }
    return false;
}

ScopedEnv::ScopedEnv() {
    if (gVm == nullptr) {
        return;
    }

    void *env = nullptr;
    jint status = gVm->GetEnv(&env, JNI_VERSION_1_6);
    if (status == JNI_OK) {
        _env = static_cast<JNIEnv *>(env);
    } else if (status == JNI_EDETACHED && gVm->AttachCurrentThread(&_env, nullptr) == JNI_OK) {
        _attached = true;
    }
}

ScopedEnv::~ScopedEnv() {
    if (_attached) {
        gVm->DetachCurrentThread();
    }
}

} // namespace tehreer::android
