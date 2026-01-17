import { PrismaClient, TableStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database...");

  // Clear existing data - Delete in order to respect foreign key constraints
  console.log("  Clearing existing data...");

  // Delete child records first (those with foreign keys)
  await prisma.transactionItemModifier.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.productVariant.deleteMany();

  // Delete parent records (those referenced by foreign keys)
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.table.deleteMany();

  console.log(" All existing data cleared!");

  console.log("  Creating products...");
  // Create Products with Variants and Modifiers
  const coffee = await prisma.product.create({
    data: {
      id: "p1",
      name: "Espresso",
      category: "Beverages",
      description: "Rich and bold espresso shot",
      basePrice: 80.0,
      costPrice: 20.0,
      totalStock: 100,
      reorderPoint: 20,
      imageUrl:
        "https://images.unsplash.com/photo-1664142638093-9a78da96c425?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  });

  const latte = await prisma.product.create({
    data: {
      id: "p2",
      name: "Caffe Latte",
      category: "Beverages",
      description: "Smooth espresso with steamed milk",
      basePrice: 120.0,
      costPrice: 30.0,
      totalStock: 80,
      reorderPoint: 15,
      imageUrl:
        "https://plus.unsplash.com/premium_photo-1671559021551-95106555ee19?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  });

  const pizza = await prisma.product.create({
    data: {
      id: "p3",
      name: "Margherita Pizza",
      category: "Food",
      description: "Classic pizza with tomato, mozzarella, and basil",
      basePrice: 350.0,
      costPrice: 120.0,
      totalStock: 50,
      reorderPoint: 10,
      imageUrl:
        "https://images.unsplash.com/photo-1702716059239-385baacdabdc?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  });

  const burger = await prisma.product.create({
    data: {
      id: "p4",
      name: "Classic Burger",
      category: "Food",
      description: "Juicy beef patty with fresh vegetables",
      basePrice: 180.0,
      costPrice: 60.0,
      totalStock: 40,
      reorderPoint: 8,
      imageUrl:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&crop=center",
    },
  });

  const pasta = await prisma.product.create({
    data: {
      id: "p5",
      name: "Carbonara Pasta",
      category: "Food",
      description: "Creamy pasta with bacon and parmesan",
      basePrice: 220.0,
      costPrice: 70.0,
      totalStock: 30,
      reorderPoint: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1588013273468-315fd88ea34c?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  });

  const cake = await prisma.product.create({
    data: {
      id: "p6",
      name: "Chocolate Cake",
      category: "Desserts",
      description: "Rich chocolate cake slice",
      basePrice: 150.0,
      costPrice: 50.0,
      totalStock: 25,
      reorderPoint: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1582650949011-13bacf9a35fd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjd8fGNob2NvbGF0ZSUyMGNha2V8ZW58MHx8MHx8fDA%3D",
    },
  });

  const salad = await prisma.product.create({
    data: {
      id: "p7",
      name: "Caesar Salad",
      category: "Food",
      description: "Fresh romaine lettuce with caesar dressing",
      basePrice: 160.0,
      costPrice: 55.0,
      totalStock: 35,
      reorderPoint: 7,
      imageUrl:
        "https://plus.unsplash.com/premium_photo-1664478283448-94d7b72a23ed?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  });

  const smoothie = await prisma.product.create({
    data: {
      id: "p8",
      name: "Mango Smoothie",
      category: "Beverages",
      description: "Refreshing mango smoothie",
      basePrice: 130.0,
      costPrice: 35.0,
      totalStock: 60,
      reorderPoint: 12,
      imageUrl:
        "https://images.unsplash.com/photo-1623400518626-6ea9ab64c5ec?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  });

  console.log(" Creating product variants...");
  // Create Product Variants
  await prisma.productVariant.createMany({
    data: [
      // Coffee sizes
      {
        productId: coffee.id,
        name: "Single Shot",
        price: 80.0,
        stock: 50,
        sku: "ESP-SINGLE",
      },
      {
        productId: coffee.id,
        name: "Double Shot",
        price: 120.0,
        stock: 50,
        sku: "ESP-DOUBLE",
      },
      // Latte sizes
      {
        productId: latte.id,
        name: "Small (12oz)",
        price: 120.0,
        stock: 30,
        sku: "LAT-S",
      },
      {
        productId: latte.id,
        name: "Medium (16oz)",
        price: 140.0,
        stock: 30,
        sku: "LAT-M",
      },
      {
        productId: latte.id,
        name: "Large (20oz)",
        price: 160.0,
        stock: 20,
        sku: "LAT-L",
      },
      // Pizza sizes
      {
        productId: pizza.id,
        name: 'Small (8")',
        price: 350.0,
        stock: 20,
        sku: "PIZ-S",
      },
      {
        productId: pizza.id,
        name: 'Medium (12")',
        price: 450.0,
        stock: 20,
        sku: "PIZ-M",
      },
      {
        productId: pizza.id,
        name: 'Large (16")',
        price: 550.0,
        stock: 10,
        sku: "PIZ-L",
      },
      // Burger sizes
      {
        productId: burger.id,
        name: "Regular",
        price: 180.0,
        stock: 25,
        sku: "BUR-R",
      },
      {
        productId: burger.id,
        name: "Double Patty",
        price: 250.0,
        stock: 15,
        sku: "BUR-D",
      },
      // Smoothie sizes
      {
        productId: smoothie.id,
        name: "Regular",
        price: 130.0,
        stock: 30,
        sku: "SMO-R",
      },
      {
        productId: smoothie.id,
        name: "Large",
        price: 160.0,
        stock: 30,
        sku: "SMO-L",
      },
    ],
  });

  console.log(" Creating modifier groups and modifiers...");
  // Create Modifier Groups and Modifiers
  const latteSizeGroup = await prisma.modifierGroup.create({
    data: {
      productId: latte.id,
      name: "Milk Type",
      required: false,
      maxSelections: 1,
    },
  });

  await prisma.modifier.createMany({
    data: [
      {
        modifierGroupId: latteSizeGroup.id,
        name: "Whole Milk",
        price: 0,
        category: "Milk",
      },
      {
        modifierGroupId: latteSizeGroup.id,
        name: "Oat Milk",
        price: 20.0,
        category: "Milk",
      },
      {
        modifierGroupId: latteSizeGroup.id,
        name: "Almond Milk",
        price: 20.0,
        category: "Milk",
      },
      {
        modifierGroupId: latteSizeGroup.id,
        name: "Soy Milk",
        price: 15.0,
        category: "Milk",
      },
    ],
  });

  const latteAddonsGroup = await prisma.modifierGroup.create({
    data: {
      productId: latte.id,
      name: "Add-ons",
      required: false,
      maxSelections: 3,
    },
  });

  await prisma.modifier.createMany({
    data: [
      {
        modifierGroupId: latteAddonsGroup.id,
        name: "Extra Shot",
        price: 30.0,
        category: "Add-on",
      },
      {
        modifierGroupId: latteAddonsGroup.id,
        name: "Vanilla Syrup",
        price: 15.0,
        category: "Add-on",
      },
      {
        modifierGroupId: latteAddonsGroup.id,
        name: "Caramel Syrup",
        price: 15.0,
        category: "Add-on",
      },
      {
        modifierGroupId: latteAddonsGroup.id,
        name: "Whipped Cream",
        price: 20.0,
        category: "Add-on",
      },
    ],
  });

  const burgerAddonsGroup = await prisma.modifierGroup.create({
    data: {
      productId: burger.id,
      name: "Burger Add-ons",
      required: false,
      maxSelections: 5,
    },
  });

  await prisma.modifier.createMany({
    data: [
      {
        modifierGroupId: burgerAddonsGroup.id,
        name: "Extra Cheese",
        price: 25.0,
        category: "Add-on",
      },
      {
        modifierGroupId: burgerAddonsGroup.id,
        name: "Bacon",
        price: 40.0,
        category: "Add-on",
      },
      {
        modifierGroupId: burgerAddonsGroup.id,
        name: "Avocado",
        price: 30.0,
        category: "Add-on",
      },
      {
        modifierGroupId: burgerAddonsGroup.id,
        name: "Fried Egg",
        price: 25.0,
        category: "Add-on",
      },
      {
        modifierGroupId: burgerAddonsGroup.id,
        name: "Onion Rings",
        price: 35.0,
        category: "Add-on",
      },
    ],
  });

  const pizzaToppingsGroup = await prisma.modifierGroup.create({
    data: {
      productId: pizza.id,
      name: "Extra Toppings",
      required: false,
      maxSelections: 5,
    },
  });

  await prisma.modifier.createMany({
    data: [
      {
        modifierGroupId: pizzaToppingsGroup.id,
        name: "Pepperoni",
        price: 50.0,
        category: "Topping",
      },
      {
        modifierGroupId: pizzaToppingsGroup.id,
        name: "Mushrooms",
        price: 40.0,
        category: "Topping",
      },
      {
        modifierGroupId: pizzaToppingsGroup.id,
        name: "Olives",
        price: 35.0,
        category: "Topping",
      },
      {
        modifierGroupId: pizzaToppingsGroup.id,
        name: "Extra Cheese",
        price: 45.0,
        category: "Topping",
      },
      {
        modifierGroupId: pizzaToppingsGroup.id,
        name: "Bell Peppers",
        price: 40.0,
        category: "Topping",
      },
    ],
  });

  console.log(" Creating customers...");
  // Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      id: "c1",
      membershipCardNumber: "TUB-17356896-237",
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      phone: "09171234567",
      loyaltyPoints: 250,
      joinedDate: new Date("2024-01-15"),
      birthday: new Date("1990-05-20"),
      tags: ["VIP", "Regular Customer"],
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      id: "c2",
      membershipCardNumber: "TUB-17356906-374",
      name: "Bob Smith",
      email: "bob.smith@example.com",
      phone: "09187654321",
      loyaltyPoints: 120,
      joinedDate: new Date("2024-02-20"),
      tags: ["Regular Customer"],
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      id: "c3",
      membershipCardNumber: "TUB-17356916-511",
      name: "Charlie Puth",
      email: "charlie.puth@example.com",
      phone: "09199998888",
      loyaltyPoints: 450,
      joinedDate: new Date("2024-01-10"),
      birthday: new Date("1985-08-15"),
      tags: ["VIP", "High Spender"],
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      id: "c4",
      membershipCardNumber: "TUB-17356926-648",
      name: "Diana Prince",
      email: "diana.prince@example.com",
      phone: "09181112222",
      loyaltyPoints: 80,
      joinedDate: new Date("2024-03-05"),
      tags: ["New Customer"],
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      id: "c5",
      membershipCardNumber: "TUB-17356936-785",
      name: "Edward Norton",
      email: "edward.norton@example.com",
      phone: "09172223333",
      loyaltyPoints: 320,
      joinedDate: new Date("2024-01-25"),
      birthday: new Date("1970-12-10"),
      tags: ["Regular Customer", "Senior Citizen"],
    },
  });

  console.log(" Creating tables...");
  // Create Tables
  const tables = [
    {
      id: "t1",
      number: "1",
      capacity: 2,
      status: TableStatus.AVAILABLE,
      location: "Indoor",
    },
    {
      id: "t2",
      number: "2",
      capacity: 4,
      status: TableStatus.OCCUPIED,
      location: "Indoor",
    },
    {
      id: "t3",
      number: "3",
      capacity: 4,
      status: TableStatus.AVAILABLE,
      location: "Indoor",
    },
    {
      id: "t4",
      number: "4",
      capacity: 6,
      status: TableStatus.RESERVED,
      location: "Indoor",
    },
    {
      id: "t5",
      number: "5",
      capacity: 2,
      status: TableStatus.AVAILABLE,
      location: "Outdoor",
    },
    {
      id: "t6",
      number: "6",
      capacity: 4,
      status: TableStatus.OCCUPIED,
      location: "Outdoor",
    },
    {
      id: "t7",
      number: "7",
      capacity: 8,
      status: TableStatus.AVAILABLE,
      location: "Indoor",
    },
    {
      id: "t8",
      number: "8",
      capacity: 2,
      status: TableStatus.NEEDS_CLEANING,
      location: "Bar",
    },
    {
      id: "t9",
      number: "9",
      capacity: 4,
      status: TableStatus.AVAILABLE,
      location: "Indoor",
    },
    {
      id: "t10",
      number: "10",
      capacity: 6,
      status: TableStatus.AVAILABLE,
      location: "Outdoor",
    },
  ];

  for (const table of tables) {
    await prisma.table.create({ data: table });
  }

  console.log(" Seeding completed successfully!");
  console.log(" Database seeded with:");
  console.log("   - 8 Products with variants and modifiers");
  console.log("   - 5 Customers with loyalty points");
  console.log("   - 10 Tables in various locations");
}

main()
  .catch((e) => {
    console.error(" Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
