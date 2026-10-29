// swift-tools-version:6.0
// The Tehreer-Cocoa runner of benchmarks/scenarios.json. benchmarks/run.mjs copies this folder to a
// scratch directory and replaces the placeholder path of the dependency with the checkout of Tehreer-Cocoa, so that
// nothing is built inside that repository. The result is a command line program for the iOS
// simulator, started with `xcrun simctl spawn`.
import PackageDescription

let package = Package(
    name: "tehreer-cocoa-benchmark",
    platforms: [.iOS(.v15)],
    dependencies: [
        .package(path: "TEHREER_COCOA_PATH")
    ],
    targets: [
        .executableTarget(
            name: "bench",
            dependencies: [.product(name: "TehreerCocoa", package: "tehreerCocoa")],
            path: "Sources/bench"
        )
    ],
    swiftLanguageModes: [.v5]
)
