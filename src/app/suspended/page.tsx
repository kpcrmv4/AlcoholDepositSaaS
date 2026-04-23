export const dynamic = 'force-dynamic';

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded border border-amber-200 bg-white p-8 text-center shadow">
        <div className="mb-3 text-4xl">⏸️</div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900">
          บริษัทของคุณถูกระงับการใช้งาน
        </h1>
        <p className="text-sm text-slate-600">
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอเปิดใช้งานต่อ
        </p>
      </div>
    </div>
  );
}
