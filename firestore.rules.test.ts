import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

const RULES_PATH = "../../../firestore.rules.fixed";

beforeAll(async () => {
  const rules = fs.readFileSync(RULES_PATH, "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: "test-project",
    firestore: {
      rules,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ============================================================================
// USER PROFILES TESTS
// ============================================================================

describe("User Profiles Security", () => {
  const setupUsers = async () => {
    const adminDb = testEnv.authenticatedContext("admin-uid").firestore();
    const manufacturerDb = testEnv
      .authenticatedContext("manufacturer-uid")
      .firestore();

    // Create admin user
    await adminDb
      .collection("users")
      .doc("admin-uid")
      .set({
        role: "ADMIN",
        isVerified: true,
        email: "admin@test.com",
      });

    // Create manufacturer user
    await manufacturerDb
      .collection("users")
      .doc("manufacturer-uid")
      .set({
        role: "MANUFACTURER",
        isVerified: false,
        email: "mfg@test.com",
        isPublic: true,
      });
  };

  test("user can read their own profile", async () => {
    const userDb = testEnv.authenticatedContext("user-uid").firestore();
    await assertSucceeds(
      userDb.collection("users").doc("user-uid").set({
        role: "WHOLESALER",
        isVerified: false,
        email: "user@test.com",
      })
    );

    // Can read own profile
    await assertSucceeds(userDb.collection("users").doc("user-uid").get());
  });

  test("unauthenticated user cannot read profiles", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      unauthDb.collection("users").doc("any-uid").get()
    );
  });

  test("user cannot escalate their own role", async () => {
    const userDb = testEnv.authenticatedContext("user-uid").firestore();

    // Create user as wholesaler
    await assertSucceeds(
      userDb.collection("users").doc("user-uid").set({
        role: "WHOLESALER",
        isVerified: false,
        email: "user@test.com",
      })
    );

    // Try to escalate to ADMIN
    await assertFails(
      userDb
        .collection("users")
        .doc("user-uid")
        .update({ role: "ADMIN" })
    );
  });

  test("user cannot set isVerified on themselves", async () => {
    const userDb = testEnv.authenticatedContext("user-uid").firestore();

    await assertSucceeds(
      userDb.collection("users").doc("user-uid").set({
        role: "MANUFACTURER",
        isVerified: false,
        email: "user@test.com",
      })
    );

    // Try to verify themselves
    await assertFails(
      userDb
        .collection("users")
        .doc("user-uid")
        .update({ isVerified: true })
    );
  });

  test("admin can modify any user profile", async () => {
    await setupUsers();
    const adminDb = testEnv.authenticatedContext("admin-uid").firestore();

    // Admin can update another user's profile
    await assertSucceeds(
      adminDb
        .collection("users")
        .doc("manufacturer-uid")
        .update({ isVerified: true })
    );
  });

  test("public manufacturer profiles are readable by anyone", async () => {
    await setupUsers();
    const otherUserDb = testEnv
      .authenticatedContext("other-uid")
      .firestore();

    // Other user can read public manufacturer
    await assertSucceeds(
      otherUserDb.collection("users").doc("manufacturer-uid").get()
    );
  });

  test("cannot read other users' private profiles", async () => {
    const user1Db = testEnv.authenticatedContext("user1-uid").firestore();
    const user2Db = testEnv.authenticatedContext("user2-uid").firestore();

    // User1 creates profile
    await assertSucceeds(
      user1Db.collection("users").doc("user1-uid").set({
        role: "WHOLESALER",
        isVerified: false,
        isPublic: false,
        email: "user1@test.com",
      })
    );

    // User2 cannot read it
    await assertFails(user2Db.collection("users").doc("user1-uid").get());
  });

  test("new users cannot start as ADMIN", async () => {
    const userDb = testEnv.authenticatedContext("user-uid").firestore();

    await assertFails(
      userDb.collection("users").doc("user-uid").set({
        role: "ADMIN",
        isVerified: false,
        email: "hacker@test.com",
      })
    );
  });

  test("new users cannot start as verified", async () => {
    const userDb = testEnv.authenticatedContext("user-uid").firestore();

    await assertFails(
      userDb.collection("users").doc("user-uid").set({
        role: "MANUFACTURER",
        isVerified: true,
        email: "hacker@test.com",
      })
    );
  });
});

// ============================================================================
// PRODUCTS TESTS
// ============================================================================

describe("Products Security", () => {
  test("only manufacturers can create products", async () => {
    const mfgDb = testEnv.authenticatedContext("mfg-uid").firestore();
    const userDb = testEnv.authenticatedContext("user-uid").firestore();

    // Setup manufacturer
    await mfgDb.collection("users").doc("mfg-uid").set({
      role: "MANUFACTURER",
      isVerified: true,
      email: "mfg@test.com",
    });

    // Setup user as wholesaler
    await userDb.collection("users").doc("user-uid").set({
      role: "WHOLESALER",
      isVerified: false,
      email: "user@test.com",
    });

    // Manufacturer can create
    await assertSucceeds(
      mfgDb.collection("products").doc("product-1").set({
        manufacturerId: "mfg-uid",
        name: "Valid Product",
        price: 100,
        stock: 10,
        description: "A valid product",
      })
    );

    // Wholesaler cannot create
    await assertFails(
      userDb.collection("products").doc("product-2").set({
        manufacturerId: "user-uid",
        name: "Hacked Product",
        price: 50,
        stock: 10,
        description: "A hacked product",
      })
    );
  });

  test("manufacturer cannot create product with negative price", async () => {
    const mfgDb = testEnv.authenticatedContext("mfg-uid").firestore();

    await mfgDb.collection("users").doc("mfg-uid").set({
      role: "MANUFACTURER",
      isVerified: true,
    });

    await assertFails(
      mfgDb.collection("products").doc("product-1").set({
        manufacturerId: "mfg-uid",
        name: "Negative Product",
        price: -100,
        stock: 10,
        description: "Invalid",
      })
    );
  });

  test("manufacturer cannot create product for someone else", async () => {
    const mfgDb = testEnv.authenticatedContext("mfg-uid").firestore();

    await mfgDb.collection("users").doc("mfg-uid").set({
      role: "MANUFACTURER",
      isVerified: true,
    });

    await assertFails(
      mfgDb.collection("products").doc("product-1").set({
        manufacturerId: "different-mfg",
        name: "Spoofed Product",
        price: 100,
        stock: 10,
        description: "Invalid",
      })
    );
  });

  test("manufacturer can only edit their own products", async () => {
    const mfg1Db = testEnv.authenticatedContext("mfg1-uid").firestore();
    const mfg2Db = testEnv.authenticatedContext("mfg2-uid").firestore();

    // Setup both manufacturers
    await mfg1Db.collection("users").doc("mfg1-uid").set({
      role: "MANUFACTURER",
      isVerified: true,
    });

    await mfg2Db.collection("users").doc("mfg2-uid").set({
      role: "MANUFACTURER",
      isVerified: true,
    });

    // MFG1 creates product
    await assertSucceeds(
      mfg1Db.collection("products").doc("product-1").set({
        manufacturerId: "mfg1-uid",
        name: "MFG1 Product",
        price: 100,
        stock: 10,
        description: "MFG1 product",
      })
    );

    // MFG2 cannot edit
    await assertFails(
      mfg2Db
        .collection("products")
        .doc("product-1")
        .update({ price: 50 })
    );
  });

  test("cannot update product to invalid state", async () => {
    const mfgDb = testEnv.authenticatedContext("mfg-uid").firestore();

    await mfgDb.collection("users").doc("mfg-uid").set({
      role: "MANUFACTURER",
      isVerified: true,
    });

    // Create valid product
    await assertSucceeds(
      mfgDb.collection("products").doc("product-1").set({
        manufacturerId: "mfg-uid",
        name: "Valid Product",
        price: 100,
        stock: 10,
        description: "Valid",
      })
    );

    // Cannot set price to negative
    await assertFails(
      mfgDb
        .collection("products")
        .doc("product-1")
        .update({ price: -50 })
    );
  });
});

// ============================================================================
// ORDERS TESTS
// ============================================================================

describe("Orders Security", () => {
  const setupUsers = async () => {
    const buyerDb = testEnv
      .authenticatedContext("buyer-uid")
      .firestore();
    const sellerDb = testEnv
      .authenticatedContext("seller-uid")
      .firestore();

    await buyerDb.collection("users").doc("buyer-uid").set({
      role: "WHOLESALER",
      isVerified: true,
    });

    await sellerDb.collection("users").doc("seller-uid").set({
      role: "MANUFACTURER",
      isVerified: true,
    });
  };

  test("buyer can only create orders for themselves", async () => {
    await setupUsers();
    const buyerDb = testEnv.authenticatedContext("buyer-uid").firestore();

    // Valid: buyer creates for themselves
    await assertSucceeds(
      buyerDb.collection("orders").doc("order-1").set({
        buyerId: "buyer-uid",
        sellerId: "seller-uid",
        totalAmount: 1000,
        items: [{ productId: "p1", quantity: 2 }],
      })
    );

    // Invalid: buyer tries to create for someone else
    await assertFails(
      buyerDb.collection("orders").doc("order-2").set({
        buyerId: "other-buyer",
        sellerId: "seller-uid",
        totalAmount: 1000,
        items: [{ productId: "p1", quantity: 2 }],
      })
    );
  });

  test("only authenticated users can create orders", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      unauthDb.collection("orders").doc("order-1").set({
        buyerId: "any-uid",
        sellerId: "seller-uid",
        totalAmount: 1000,
        items: [],
      })
    );
  });

  test("seller can update order status", async () => {
    await setupUsers();
    const buyerDb = testEnv.authenticatedContext("buyer-uid").firestore();
    const sellerDb = testEnv.authenticatedContext("seller-uid").firestore();

    // Create order
    await assertSucceeds(
      buyerDb.collection("orders").doc("order-1").set({
        buyerId: "buyer-uid",
        sellerId: "seller-uid",
        totalAmount: 1000,
        items: [{ productId: "p1", quantity: 2 }],
        status: "Pending",
      })
    );

    // Seller can update status
    await assertSucceeds(
      sellerDb
        .collection("orders")
        .doc("order-1")
        .update({ status: "Processing" })
    );

    // But seller cannot change buyer/seller/amount
    await assertFails(
      sellerDb
        .collection("orders")
        .doc("order-1")
        .update({ totalAmount: 500 })
    );
  });

  test("buyer cannot modify seller or amount", async () => {
    await setupUsers();
    const buyerDb = testEnv.authenticatedContext("buyer-uid").firestore();

    // Create order
    await assertSucceeds(
      buyerDb.collection("orders").doc("order-1").set({
        buyerId: "buyer-uid",
        sellerId: "seller-uid",
        totalAmount: 1000,
        items: [{ productId: "p1", quantity: 2 }],
      })
    );

    // Buyer cannot change seller
    await assertFails(
      buyerDb
        .collection("orders")
        .doc("order-1")
        .update({ sellerId: "hacker-uid" })
    );

    // Buyer cannot change amount
    await assertFails(
      buyerDb
        .collection("orders")
        .doc("order-1")
        .update({ totalAmount: 100 })
    );
  });

  test("orders must have positive amount", async () => {
    await setupUsers();
    const buyerDb = testEnv.authenticatedContext("buyer-uid").firestore();

    await assertFails(
      buyerDb.collection("orders").doc("order-1").set({
        buyerId: "buyer-uid",
        sellerId: "seller-uid",
        totalAmount: -1000,
        items: [],
      })
    );
  });

  test("third party cannot read orders", async () => {
    await setupUsers();
    const buyerDb = testEnv.authenticatedContext("buyer-uid").firestore();
    const strangerDb = testEnv
      .authenticatedContext("stranger-uid")
      .firestore();

    // Create order
    await assertSucceeds(
      buyerDb.collection("orders").doc("order-1").set({
        buyerId: "buyer-uid",
        sellerId: "seller-uid",
        totalAmount: 1000,
        items: [],
      })
    );

    // Stranger cannot read
    await assertFails(strangerDb.collection("orders").doc("order-1").get());
  });
});

// ============================================================================
// NOTIFICATIONS TESTS
// ============================================================================

describe("Notifications Security", () => {
  test("cannot spam notifications to others", async () => {
    const user1Db = testEnv.authenticatedContext("user1").firestore();
    const user2Db = testEnv.authenticatedContext("user2").firestore();

    // Setup users
    await user1Db.collection("users").doc("user1").set({
      role: "WHOLESALER",
      isVerified: false,
    });

    await user2Db.collection("users").doc("user2").set({
      role: "MANUFACTURER",
      isVerified: false,
    });

    // User1 cannot create notification for User2
    await assertFails(
      user1Db.collection("notifications").doc("notif-1").set({
        userId: "user2",
        type: "ORDER",
        message: "You have an order",
      })
    );
  });

  test("user can read their own notifications", async () => {
    const userDb = testEnv.authenticatedContext("user-uid").firestore();

    // Create user
    await userDb.collection("users").doc("user-uid").set({
      role: "WHOLESALER",
      isVerified: false,
    });

    // Create own notification
    await assertSucceeds(
      userDb.collection("notifications").doc("notif-1").set({
        userId: "user-uid",
        type: "ORDER",
        message: "Test",
      })
    );

    // Can read own
    await assertSucceeds(
      userDb.collection("notifications").doc("notif-1").get()
    );
  });

  test("user cannot read others' notifications", async () => {
    const user1Db = testEnv.authenticatedContext("user1").firestore();
    const user2Db = testEnv.authenticatedContext("user2").firestore();

    // Setup
    await user1Db.collection("users").doc("user1").set({
      role: "WHOLESALER",
      isVerified: false,
    });

    await user2Db.collection("users").doc("user2").set({
      role: "WHOLESALER",
      isVerified: false,
    });

    // Create notification for user1 as admin
    const adminDb = testEnv.authenticatedContext("admin-uid").firestore();
    await adminDb.collection("users").doc("admin-uid").set({
      role: "ADMIN",
      isVerified: true,
    });

    await assertSucceeds(
      adminDb.collection("notifications").doc("notif-1").set({
        userId: "user1",
        type: "ORDER",
        message: "Test",
      })
    );

    // User2 cannot read user1's notification
    await assertFails(
      user2Db.collection("notifications").doc("notif-1").get()
    );
  });

  test("only valid notification types allowed", async () => {
    const userDb = testEnv.authenticatedContext("user-uid").firestore();

    await userDb.collection("users").doc("user-uid").set({
      role: "WHOLESALER",
      isVerified: false,
    });

    // Invalid type
    await assertFails(
      userDb.collection("notifications").doc("notif-1").set({
        userId: "user-uid",
        type: "INVALID_TYPE",
        message: "Test",
      })
    );
  });
});

// ============================================================================
// RFQ TESTS
// ============================================================================

describe("RFQ Security", () => {
  const setupUsers = async () => {
    const wholesalerDb = testEnv
      .authenticatedContext("wholesaler-uid")
      .firestore();
    const manufacturerDb = testEnv
      .authenticatedContext("manufacturer-uid")
      .firestore();

    await wholesalerDb.collection("users").doc("wholesaler-uid").set({
      role: "WHOLESALER",
      isVerified: true,
    });

    await manufacturerDb
      .collection("users")
      .doc("manufacturer-uid")
      .set({
        role: "MANUFACTURER",
        isVerified: true,
      });
  };

  test("only wholesalers can create RFQs", async () => {
    await setupUsers();
    const manufacturerDb = testEnv
      .authenticatedContext("manufacturer-uid")
      .firestore();

    // Manufacturer cannot create RFQ
    await assertFails(
      manufacturerDb.collection("rfqs").doc("rfq-1").set({
        wholesalerId: "manufacturer-uid",
        manufacturerId: "wholesaler-uid",
        quantity: 100,
        productId: "p1",
      })
    );
  });

  test("wholesaler can only create RFQ for themselves", async () => {
    await setupUsers();
    const wholesalerDb = testEnv
      .authenticatedContext("wholesaler-uid")
      .firestore();

    // Valid
    await assertSucceeds(
      wholesalerDb.collection("rfqs").doc("rfq-1").set({
        wholesalerId: "wholesaler-uid",
        manufacturerId: "manufacturer-uid",
        quantity: 100,
        productId: "p1",
      })
    );

    // Invalid: wholesaler creates for someone else
    await assertFails(
      wholesalerDb.collection("rfqs").doc("rfq-2").set({
        wholesalerId: "other-wholesaler",
        manufacturerId: "manufacturer-uid",
        quantity: 100,
        productId: "p1",
      })
    );
  });

  test("manufacturer can only update quote fields", async () => {
    await setupUsers();
    const wholesalerDb = testEnv
      .authenticatedContext("wholesaler-uid")
      .firestore();
    const manufacturerDb = testEnv
      .authenticatedContext("manufacturer-uid")
      .firestore();

    // Create RFQ
    await assertSucceeds(
      wholesalerDb.collection("rfqs").doc("rfq-1").set({
        wholesalerId: "wholesaler-uid",
        manufacturerId: "manufacturer-uid",
        quantity: 100,
        productId: "p1",
      })
    );

    // Manufacturer can update quote
    await assertSucceeds(
      manufacturerDb
        .collection("rfqs")
        .doc("rfq-1")
        .update({ quotePrice: 50, status: "QUOTED" })
    );

    // Manufacturer cannot change wholesaler
    await assertFails(
      manufacturerDb
        .collection("rfqs")
        .doc("rfq-1")
        .update({ wholesalerId: "hacker-uid" })
    );
  });
});
