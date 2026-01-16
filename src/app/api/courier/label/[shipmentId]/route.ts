import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadLabel } from "@/lib/courierit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shipmentId } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // If we have the label stored, return it
    if (shipment.labelData) {
      const uint8Array = new Uint8Array(shipment.labelData);
      return new NextResponse(uint8Array, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${shipment.labelFileName || "label.pdf"}"`,
        },
      });
    }

    // Otherwise, try to download from Courier IT
    if (!shipment.consignmentNumber) {
      return NextResponse.json(
        { error: "No consignment number available" },
        { status: 400 }
      );
    }

    const labelBuffer = await downloadLabel(shipment.consignmentNumber);
    const labelData = Buffer.from(labelBuffer);

    // Save label to database
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        labelData,
        labelFileName: `label-${shipment.consignmentNumber}.pdf`,
        labelDownloaded: true,
      },
    });

    const uint8Array = new Uint8Array(labelData);
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="label-${shipment.consignmentNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error downloading label:", error);
    return NextResponse.json(
      { error: "Failed to download label" },
      { status: 500 }
    );
  }
}
