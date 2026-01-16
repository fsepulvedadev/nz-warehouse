import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verificando usuario admin...\n");
  
  const user = await prisma.user.findUnique({
    where: { email: "admin@nzwarehouse.co.nz" }
  });

  if (!user) {
    console.log("❌ Usuario NO encontrado");
    return;
  }

  console.log("✅ Usuario encontrado:");
  console.log("   ID:", user.id);
  console.log("   Email:", user.email);
  console.log("   Name:", user.name);
  console.log("   Role:", user.role);
  console.log("   password existe:", !!user.password);
  console.log("   password valor:", user.password);
  
  if (user.password) {
    // Verificar contraseña
    const isValid = await bcrypt.compare("admin123", user.password);
    console.log("\n🔐 Contraseña 'admin123' válida:", isValid ? "✅ SÍ" : "❌ NO");
  } else {
    console.log("\n❌ No hay password - regenerando...");
    const newHash = await bcrypt.hash("admin123", 10);
    await prisma.user.update({
      where: { email: "admin@nzwarehouse.co.nz" },
      data: { password: newHash }
    });
    console.log("✅ Password actualizado!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
