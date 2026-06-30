import { NextRequest } from "next/server";
import { getLatestBlobs } from "@/lib/queries";

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
    let lastTxHash = "";

    try {
      // Send initial data immediately
      const initialBlobs = await getLatestBlobs(20);
      if (initialBlobs.length > 0) {
        lastTxHash = initialBlobs[0].tx_hash;
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ data: initialBlobs })}\n\n`)
        );
      }

      // Poll loop
      while (!isClosed) {
        // Wait 3 seconds before checking again
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        if (isClosed) break;

        const latest = await getLatestBlobs(1);
        if (latest.length > 0) {
          const latestTx = latest[0];
          if (latestTx.tx_hash !== lastTxHash) {
            lastTxHash = latestTx.tx_hash;
            
            // Fetch the full set of 20 transactions to send as a fresh update
            const updatedBlobs = await getLatestBlobs(20);
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ data: updatedBlobs })}\n\n`)
            );
          }
        }
      }
    } catch (err) {
      console.error("SSE blobs stream error:", err);
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
