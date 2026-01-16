import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nzwarehouse.co.nz" },
    update: {},
    create: {
      email: "admin@nzwarehouse.co.nz",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // Create operator user
  const operatorPassword = await bcrypt.hash("operator123", 12);
  const operator = await prisma.user.upsert({
    where: { email: "operator@nzwarehouse.co.nz" },
    update: {},
    create: {
      email: "operator@nzwarehouse.co.nz",
      name: "Operator User",
      password: operatorPassword,
      role: "OPERATOR",
    },
  });
  console.log(`✅ Created operator user: ${operator.email}`);

  // Create sample orders for testing (optional)
  const sampleOrders = [
    {
      cartonCloudId: "sample-order-001",
      orderNumber: "ORD-001",
      customerName: "John Smith",
      customerEmail: "john@example.com",
      customerPhone: "+64 21 123 4567",
      deliveryStreet: "123 Queen Street",
      deliverySuburb: "CBD",
      deliveryCity: "Auckland",
      deliveryPostcode: "1010",
      deliveryCountry: "NZ",
      isRural: false,
      status: "READY_TO_QUOTE" as const,
      itemsJson: [
        { description: "Electronics Box", weight: 2.5, length: 30, width: 20, height: 15 },
        { description: "Accessories Pack", weight: 0.5, length: 15, width: 10, height: 5 },
      ],
    },
    {
      cartonCloudId: "sample-order-002",
      orderNumber: "ORD-002",
      customerName: "Sarah Johnson",
      customerEmail: "sarah@example.com",
      deliveryStreet: "456 Cuba Street",
      deliverySuburb: "Te Aro",
      deliveryCity: "Wellington",
      deliveryPostcode: "6011",
      deliveryCountry: "NZ",
      isRural: false,
      status: "READY_TO_QUOTE" as const,
      itemsJson: [
        { description: "Clothing Package", weight: 1.2, length: 40, width: 30, height: 10 },
      ],
    },
    {
      cartonCloudId: "sample-order-003",
      orderNumber: "ORD-003",
      customerName: "Mike Wilson",
      deliveryStreet: "789 Rural Road",
      deliverySuburb: "Countryside",
      deliveryCity: "Waikato",
      deliveryPostcode: "3200",
      deliveryCountry: "NZ",
      isRural: true,
      status: "PENDING_DATA" as const,
      itemsJson: [
        { description: "Farm Equipment", weight: 15, length: 60, width: 40, height: 30 },
      ],
    },
  ];

  for (const orderData of sampleOrders) {
    const order = await prisma.order.upsert({
      where: { cartonCloudId: orderData.cartonCloudId },
      update: {},
      create: orderData,
    });
    console.log(`✅ Created sample order: ${order.orderNumber}`);
  }

  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Test Credentials:");
  console.log("   Admin: admin@nzwarehouse.co.nz / admin123");
  console.log("   Operator: operator@nzwarehouse.co.nz / operator123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
