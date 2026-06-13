import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";

export async function GET(
  _request: Request,
  { params }: { params: { manualId: string } | Promise<{ manualId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const { manualId } = await params;

  const manual = await db.manual.findUnique({
    where: {
      id: manualId
    },
    include: {
      instrument: {
        select: {
          temporaryAccessEnabled: true
        }
      }
    }
  });

  if (!manual) {
    return new Response("Manual not found.", { status: 404 });
  }

  if (user.role === Role.TEMP && !manual.instrument.temporaryAccessEnabled) {
    return new Response("Forbidden.", { status: 403 });
  }

  const file = await readFile(manual.filePath);

  return new Response(file, {
    headers: {
      "Content-Type": manual.mimeType,
      "Content-Disposition": `attachment; filename="${manual.originalName}"`
    }
  });
}
