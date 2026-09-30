import { NextRequest } from 'next/server';
import { jsonError, jsonOk, readJson, requestIdFrom } from '@/lib/server/http';
import { listSwipeItems, saveSwipeItem, deleteSwipeItem } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request);
  try {
    const items = await listSwipeItems();
    return jsonOk({ items, total: items.length }, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request);
  try {
    const body = await readJson(request);
    const adId = typeof body.adId === 'string' ? body.adId : '';
    if (!adId) {
      return jsonError(new Error('adId is required to save into swipe file.'), requestId, 400);
    }

    const folder = typeof body.folder === 'string' && body.folder.trim() ? body.folder.trim() : 'My Swipe File';
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    const notes = typeof body.notes === 'string' ? body.notes : undefined;

    const saved = await saveSwipeItem({ adId, folder, tags, notes });
    return jsonOk({ saved, success: true }, requestId, 201);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonError(new Error('id parameter is required to delete swipe item.'), requestId, 400);
    }
    const removed = await deleteSwipeItem(id);
    return jsonOk({ removed, success: true }, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
