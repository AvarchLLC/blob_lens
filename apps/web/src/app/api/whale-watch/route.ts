import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

export const dynamic = 'force-dynamic';

export async fn GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';

    try {
        const response = await fetch(`${API_BASE_URL}/api/whale-watch?limit=${limit}`, {
            next: { revalidate: 300 }, // 5 minutes
        });

        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching whale-watch data:', error);
        return NextResponse.json({ error: 'Failed to fetch whale-watch data' }, { status: 500 });
    }
}
