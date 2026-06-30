import { NextRequest } from "next/server";
import { getRecentBlocks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  let isClosed = false;

  // Listen for client disconnect
  req.signal.addEventListener("abort", () => {
    isClosed = true;
    try {
      writer.close();
    } catch {
      // Stream might already be closed
    }
  });

  // Start the polling loop on the server
  (async () => {
    let lastBlockNumber = 0;

    try {
      // Send initial data immediately
      const initialBlocks = await getRecentBlocks(20);
      if (initialBlocks.length > 0) {
        lastBlockNumber = initialBlocks[0].block_number;
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ data: initialBlocks })}\n\n`)
        );
      }

      // Poll loop
      while (!isClosed) {
        // Wait 3 seconds before checking again
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        if (isClosed) break;

        const latest = await getRecentBlocks(1);
        if (latest.length > 0) {
          const latestBlock = latest[0];
          if (latestBlock.block_number > lastBlockNumber) {
            lastBlockNumber = latestBlock.block_number;
            
            // Fetch the full set of 20 blocks to send as a fresh update
            const updatedBlocks = await getRecentBlocks(20);
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ data: updatedBlocks })}\n\n`)
            );
          }
        }
      }
    } catch (err) {
      console.error("SSE blocks stream error:", err);
      if (!isClosed) {
        try {
          await writer.write(encoder.encode(`event: error\ndata: "Stream error"\n\n`));
          await writer.close();
        } catch {
          // Ignore
        }
      }
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
