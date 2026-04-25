import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const BUCKET = 'deposit-photos';

// ---------------------------------------------------------------------------
// POST /api/upload/photo
// ---------------------------------------------------------------------------
// Accepts multipart/form-data with:
//   - file: the image file
//   - folder: optional subfolder (e.g. "deposits", "withdrawals", "transfers")
//
// Returns { url: string } — public URL of the uploaded image
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve the caller's tenant_id. Storage RLS on `deposit-photos` requires
  // the first path segment to equal `get_user_tenant_id()::text`, so without
  // this prefix every upload fails with a 500 from a denied RLS policy.
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  const tenantId = profile?.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context for user' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'general';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 },
    );
  }

  try {
    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    let contentType = file.type;
    let ext = file.type.split('/')[1] || 'jpg';

    // Compress: convert to JPEG with reduced quality for large images
    // Note: For full server-side compression (resize, webp convert),
    // install `sharp` package: npm i sharp
    // For now, we upload as-is and rely on client-side compression
    // or add sharp when needed.
    if (ext === 'heic') ext = 'jpg';

    // Generate unique filename. The leading `${tenantId}/` segment is what
    // the storage RLS policy "Tenant users upload to own tenant folder"
    // checks (storage.foldername(name)[1] = get_user_tenant_id()::text).
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filePath = `${tenantId}/${folder}/${timestamp}-${random}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (error) {
      console.error('[Upload] Supabase Storage error:', error);
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 },
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 },
    );
  }
}
