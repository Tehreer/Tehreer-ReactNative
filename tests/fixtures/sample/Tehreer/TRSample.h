/*
 * A small header in the style of Core's, for the generator tests: a version, an object with a
 * lifecycle, a struct by value, an out parameter, a text buffer, a pointer into the object's
 * memory and an enumeration with a callback. It declares the base types itself so that the
 * generated glue can be compiled without Core.
 */

#ifndef _TEHREER_SAMPLE_H
#define _TEHREER_SAMPLE_H

#include <stdint.h>

#ifdef __cplusplus
#define TR_EXTERN_C_BEGIN extern "C" {
#define TR_EXTERN_C_END }
#else
#define TR_EXTERN_C_BEGIN
#define TR_EXTERN_C_END
#endif

#define TR_PUBLIC extern

TR_EXTERN_C_BEGIN

typedef uint8_t TRUInt8;
typedef uint32_t TRUInt32;
typedef uintptr_t TRUInteger;
typedef float TRFloat;

enum {
    TRFalse = 0,
    TRTrue  = 1
};
typedef TRUInt8 TRBoolean;

typedef struct _TRPoint {
    TRFloat x;
    TRFloat y;
} TRPoint;

enum {
    TRStringEncodingUTF8 = 0,
    TRStringEncodingUTF16 = 1
};
typedef TRUInt32 TRStringEncoding;

typedef struct _TRStringView {
    const void *buffer;
    TRUInteger length;
    TRStringEncoding encoding;
} TRStringView;

typedef struct _TRSample *TRSampleRef;

/** Called for every item. */
typedef void (*TRSampleFunc)(void *userData, TRUInteger index, TRPoint origin, TRBoolean *stop);

/** Returns the major version. */
TR_PUBLIC TRUInt32 TRSampleVersionGetMajor(void);

/** Creates a sample that the caller owns. */
TR_PUBLIC TRSampleRef TRSampleCreate(TRFloat size);

/** Returns the owner, which is not retained for the caller. */
TR_PUBLIC TRSampleRef TRSampleGetOwner(TRSampleRef sample);

TR_PUBLIC TRPoint TRSampleGetOrigin(TRSampleRef sample);

TR_PUBLIC void TRSampleSetOrigin(TRSampleRef sample, TRPoint origin);

/**
 * @param distance
 *      Receives the distance.
 * @return
 *      `TRTrue` if the distance was given, `TRFalse` if the index is out of range.
 */
TR_PUBLIC TRBoolean TRSampleGetDistance(TRSampleRef sample, TRUInteger index, TRFloat *distance);

/**
 * @param string
 *      The text, or `NULL` to clear it.
 */
TR_PUBLIC TRBoolean TRSampleSetText(TRSampleRef sample, const void *string, TRUInteger length,
    TRStringEncoding encoding);

TR_PUBLIC const TRFloat *TRSampleGetAdvancesPtr(TRSampleRef sample);

TR_PUBLIC TRBoolean TRSampleEnumerate(TRSampleRef sample, TRUInteger index, TRUInteger length,
    TRSampleFunc func, void *userData);

TR_PUBLIC TRSampleRef TRSampleRetain(TRSampleRef sample);

TR_PUBLIC void TRSampleRelease(TRSampleRef sample);

TR_EXTERN_C_END

#endif
