"use client";

import { useState } from "react";

type TestResult = {
  ok: boolean;
  message: string;
  status?: number;
  itemCount?: number;
  sampleTitles?: string[];
  detail?: string;
};

export default function TestNguonCPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const url =
        "https://phim.nguonc.com/api/films/search?keyword=" +
        encodeURIComponent("Bác Sĩ X") +
        "&page=1";
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        setResult({
          ok: false,
          status: response.status,
          message: "Trình duyệt gọi được máy chủ nhưng API trả về lỗi HTTP.",
        });
        return;
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];

      setResult({
        ok: true,
        status: response.status,
        itemCount: items.length,
        sampleTitles: items.slice(0, 5).map((item: any) =>
          String(item?.original_name || item?.name || item?.slug || "Không có tên"),
        ),
        message: "Trình duyệt đọc được JSON từ NguonC. CORS cho phép truy cập ở thời điểm kiểm tra.",
      });
    } catch (error) {
      setResult({
        ok: false,
        message:
          "Trình duyệt không đọc được phản hồi từ NguonC. Nguyên nhân thường là CORS hoặc Cloudflare chặn yêu cầu trình duyệt.",
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12 text-white">
      <h1 className="text-2xl font-bold">Kiểm tra kết nối NguonC</h1>
      <p className="mt-3 text-sm text-white/70">
        Bài kiểm tra này gọi trực tiếp API NguonC từ trình duyệt. Nó không thay
        đổi trình phát phim, không sửa PhimAPI/OPhim và không tác động đến server
        dự phòng hiện tại.
      </p>

      <button
        type="button"
        onClick={runTest}
        disabled={loading}
        className="mt-6 rounded-lg bg-red-600 px-5 py-3 font-semibold disabled:opacity-60"
      >
        {loading ? "Đang kiểm tra..." : "Kiểm tra NguonC ngay"}
      </button>

      {result && (
        <section
          className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5"
          aria-live="polite"
        >
          <h2 className="font-semibold">
            {result.ok ? "Kết quả: Thành công" : "Kết quả: Thất bại"}
          </h2>
          <p className="mt-2 text-sm">{result.message}</p>
          {typeof result.status === "number" && (
            <p className="mt-2 text-sm">HTTP: {result.status}</p>
          )}
          {typeof result.itemCount === "number" && (
            <p className="mt-2 text-sm">Số kết quả tìm thấy: {result.itemCount}</p>
          )}
          {result.sampleTitles && result.sampleTitles.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-sm text-white/80">
              {result.sampleTitles.map((title, index) => (
                <li key={index}>{title}</li>
              ))}
            </ul>
          )}
          {result.detail && (
            <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-red-300">
              {result.detail}
            </pre>
          )}
        </section>
      )}
    </main>
  );
}
