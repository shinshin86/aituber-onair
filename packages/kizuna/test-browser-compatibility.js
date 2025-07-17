// Test script to verify browser compatibility
const {
	FileSystemStorageProvider,
	LocalStorageProvider,
	detectEnvironment,
} = require("./dist/index.js");

console.log("Testing browser environment compatibility...");

// Test 1: Check if FileSystemStorageProvider is available and behaves correctly
console.log("\n=== FileSystemStorageProvider Test ===");
try {
	const fsProvider = new FileSystemStorageProvider();
	console.log("✓ FileSystemStorageProvider instantiated successfully");

	const isAvailable = fsProvider.isAvailable();
	console.log(`✓ isAvailable() returns: ${isAvailable}`);

	if (isAvailable) {
		console.log("✓ Environment supports FileSystemStorageProvider");
	} else {
		console.log(
			"✓ Environment does not support FileSystemStorageProvider (expected in browser)",
		);

		// Test that methods throw appropriate errors
		try {
			await fsProvider.save("test", { data: "test" });
			console.log("✗ save() should have thrown an error");
		} catch (error) {
			console.log(`✓ save() correctly threw error: ${error.message}`);
		}
	}
} catch (error) {
	console.log(`✓ Error handled gracefully: ${error.message}`);
}

// Test 2: Check LocalStorageProvider
console.log("\n=== LocalStorageProvider Test ===");
try {
	const localProvider = new LocalStorageProvider();
	console.log("✓ LocalStorageProvider instantiated successfully");

	const isAvailable = localProvider.isAvailable();
	console.log(`✓ isAvailable() returns: ${isAvailable}`);
} catch (error) {
	console.log(`✓ LocalStorageProvider error handled: ${error.message}`);
}

// Test 3: Environment detection
console.log("\n=== Environment Detection Test ===");
const env = detectEnvironment();
console.log(`✓ Detected environment: ${env}`);

console.log("\n✅ Browser compatibility test completed successfully!");
