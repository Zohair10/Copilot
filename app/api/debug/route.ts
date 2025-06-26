import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("GitHubCopilotData");
    const collection = db.collection("GetMetricsData");

    // Get a single document to inspect its structure
    const sampleDoc = await collection.findOne({}, { projection: { _id: 0 } });
    
    if (!sampleDoc) {
      return NextResponse.json({ error: 'No documents found' });
    }

    // Get all unique keys across all documents (sample first 10)
    const allDocs = await collection.find({}, { projection: { _id: 0 } }).limit(10).toArray();
    const allKeys = new Set<string>();
    allDocs.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });

    // Also get collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    return NextResponse.json({
      collections: collectionNames,
      sampleDocument: sampleDoc,
      documentKeys: Object.keys(sampleDoc),
      allKeysAcrossDocuments: Array.from(allKeys).sort(),
      totalDocuments: await collection.countDocuments()
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 });
  }
}
