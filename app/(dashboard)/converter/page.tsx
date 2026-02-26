"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { Upload, FileText, Download, AlertCircle, FileSpreadsheet, RotateCw, RotateCcw, X } from "lucide-react";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function ConverterPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [previewData, setPreviewData] = useState<any[][] | null>(null);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setError(null);
            setSuccess(false);
            setProgress("");
            setRotation(0);
            setPreviewData(null);
            setWorkbook(null);
            if (selectedFile.type.startsWith("image/")) {
                setPreviewUrl(URL.createObjectURL(selectedFile));
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const rotateImage = (degrees: number) => setRotation((prev) => (prev + degrees) % 360);

    const clearFile = () => {
        setFile(null); setPreviewUrl(null); setRotation(0);
        setError(null); setSuccess(false); setPreviewData(null); setWorkbook(null);
    };

    const getRotatedImage = async (imageUrl: string, rotateDeg: number): Promise<Blob> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject("Canvas context error");
                if (rotateDeg % 180 !== 0) { canvas.width = img.height; canvas.height = img.width; }
                else { canvas.width = img.width; canvas.height = img.height; }
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotateDeg * Math.PI) / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                canvas.toBlob((blob) => blob ? resolve(blob) : reject("Canvas to Blob failed"), "image/png");
            };
            img.onerror = reject;
        });

    const processConversion = async () => {
        if (!file) return;
        setLoading(true); setError(null); setPreviewData(null); setWorkbook(null);
        setProgress("Starting conversion...");

        try {
            let newWorkbook: XLSX.WorkBook;
            let extractedRows: any[][] = [];

            // ── DOCX ──────────────────────────────────────────────────────────────
            if (file.name.endsWith(".docx")) {
                const arrayBuffer = await file.arrayBuffer();
                setProgress("Extracting text from Word document...");
                const result = await mammoth.extractRawText({ arrayBuffer });
                extractedRows = result.value.split("\n").map((line) => [line]);
                const ws = XLSX.utils.aoa_to_sheet(extractedRows);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, ws, "Converted");

                // ── PDF ───────────────────────────────────────────────────────────────
            } else if (file.name.endsWith(".pdf")) {
                const arrayBuffer = await file.arrayBuffer();
                setProgress("Extracting text from PDF...");
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                type Item = { str: string; x: number; y: number; w: number; h: number };
                type CellRow = { cells: string[]; xs: number[] };

                // Pass 1: group text items into rows (per page)
                const allPageRows: Item[][][] = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    setProgress(`Reading PDF page ${i} of ${pdf.numPages}...`);
                    const page = await pdf.getPage(i);
                    const tc = await page.getTextContent();
                    const items: Item[] = (tc.items as any[])
                        .filter((it) => it.str.trim().length > 0 && it.height > 0)
                        .map((it) => ({
                            str: it.str, x: it.transform[4], y: it.transform[5],
                            w: it.width, h: it.height,
                        }));
                    const hs = items.map((it) => it.h).sort((a, b) => a - b);
                    const medH = hs.length ? hs[Math.floor(hs.length / 2)] : 10;
                    const rowTol = Math.max(medH * 0.55, 4);
                    items.sort((a, b) => b.y - a.y);
                    const rows: Item[][] = [];
                    if (items.length > 0) {
                        let cur = [items[0]], curY = items[0].y;
                        for (const it of items.slice(1)) {
                            if (Math.abs(it.y - curY) <= rowTol) cur.push(it);
                            else { rows.push(cur); cur = [it]; curY = it.y; }
                        }
                        rows.push(cur);
                    }
                    allPageRows.push(rows);
                }

                // Pass 2: split each row into cells (15pt gap threshold)
                const allCellRows: CellRow[][] = [];
                const colXs: number[] = [];
                const GAP = 15;
                for (const pageRows of allPageRows) {
                    const pageCells: CellRow[] = [];
                    for (const row of pageRows) {
                        const sorted = [...row].sort((a, b) => a.x - b.x);
                        if (sorted.length === 0) {
                            pageCells.push({ cells: [], xs: [] });
                            continue;
                        }
                        const cells: string[] = [];
                        const xs: number[] = [];
                        let text = sorted[0].str, cx = sorted[0].x;
                        let end = sorted[0].x + sorted[0].w;
                        for (let k = 1; k < sorted.length; k++) {
                            const gap = sorted[k].x - end;
                            if (gap > GAP) {
                                cells.push(text.trim()); xs.push(cx);
                                text = sorted[k].str; cx = sorted[k].x;
                            } else {
                                text += (gap > 0 ? " " : "") + sorted[k].str;
                            }
                            end = sorted[k].x + sorted[k].w;
                        }
                        cells.push(text.trim()); xs.push(cx);
                        pageCells.push({ cells, xs });
                        colXs.push(...xs); // all rows contribute to column grid
                    }
                    allCellRows.push(pageCells);
                }

                // Pass 3: cluster X positions → column centers
                // 80pt tolerance merges centered headers with left-aligned data.
                const colXsSorted = [...colXs].sort((a, b) => a - b);
                const colCenters: number[] = [];
                if (colXsSorted.length > 0) {
                    let sum = colXsSorted[0], cnt = 1, start = colXsSorted[0];
                    for (let k = 1; k < colXsSorted.length; k++) {
                        if (colXsSorted[k] - start <= 80) { sum += colXsSorted[k]; cnt++; }
                        else { colCenters.push(sum / cnt); start = colXsSorted[k]; sum = colXsSorted[k]; cnt = 1; }
                    }
                    colCenters.push(sum / cnt);
                    colCenters.sort((a, b) => a - b);
                }

                const snap = (x: number) => {
                    if (!colCenters.length) return 0;
                    let best = 0, dist = Math.abs(x - colCenters[0]);
                    for (let c = 1; c < colCenters.length; c++) {
                        const d = Math.abs(x - colCenters[c]);
                        if (d < dist) { dist = d; best = c; }
                    }
                    return best;
                };

                // Pass 4: snap every cell to its column center
                // Title rows (start near left margin) snap to col 0 naturally.
                // Single-value rows (phone/email only) snap to their correct column.
                extractedRows = [];
                const numCols = Math.max(colCenters.length, 1);
                for (let p = 0; p < allCellRows.length; p++) {
                    setProgress(`Building sheet for page ${p + 1} of ${allCellRows.length}...`);
                    for (const { cells, xs } of allCellRows[p]) {
                        if (!cells.some((c) => c.length > 0)) continue;

                        const nonEmpty = cells.filter((c) => c.length > 0);
                        // Heading detection: single cell, no digits → title/section row → force col 0
                        if (nonEmpty.length === 1 && !/\d/.test(nonEmpty[0])) {
                            const out: string[] = [nonEmpty[0]];
                            while (out.length < numCols) out.push("");
                            extractedRows.push(out);
                            continue;
                        }

                        const bucket: string[] = Array(numCols).fill("");
                        for (let c = 0; c < cells.length; c++) {
                            if (!cells[c]) continue;
                            const col = snap(xs[c]);
                            bucket[col] = bucket[col] ? bucket[col] + " " + cells[c] : cells[c];
                        }
                        let last = numCols - 1;
                        while (last > 0 && bucket[last] === "") last--;
                        extractedRows.push(bucket.slice(0, last + 1));
                    }
                    if (p < allCellRows.length - 1) extractedRows.push([]);
                }

                const maxW = extractedRows.reduce((m, r) => Math.max(m, r.length), 0);
                const padded = extractedRows.map((r) => { const o = [...r]; while (o.length < maxW) o.push(""); return o; });
                const pdfSheet = XLSX.utils.aoa_to_sheet(padded);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, pdfSheet, "PDF Data");

                // ── Images (OCR) ──────────────────────────────────────────────────────
            } else if (file.name.match(/\.(jpg|jpeg|png)$/i)) {
                setProgress("Preparing image...");
                const imageToProcess = previewUrl && rotation !== 0 ? await getRotatedImage(previewUrl, rotation) : file;
                setProgress("Initializing OCR engine...");
                const result = await Tesseract.recognize(imageToProcess as any, "eng", {
                    logger: (m: any) => {
                        if (m.status === "recognizing text")
                            setProgress(`OCR Scanning: ${(m.progress * 100).toFixed(0)}%`);
                    },
                });
                setProgress("Formatting extracted text...");
                extractedRows = result.data.text.split("\n").map((line) => [line]);
                const ocrSheet = XLSX.utils.aoa_to_sheet(extractedRows);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, ocrSheet, "OCR Data");

                // ── CSV ───────────────────────────────────────────────────────────────
            } else if (file.name.match(/\.csv$/i)) {
                setProgress("Parsing CSV file...");
                const wb = XLSX.read(await file.text(), { type: "string", raw: true });
                newWorkbook = wb;
                extractedRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];

                // ── TSV ───────────────────────────────────────────────────────────────
            } else if (file.name.match(/\.tsv$/i)) {
                setProgress("Parsing TSV file...");
                extractedRows = (await file.text()).split("\n").map((line) => line.split("\t"));
                const tsvSheet = XLSX.utils.aoa_to_sheet(extractedRows);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, tsvSheet, "TSV Data");

                // ── XLS / XLSX ────────────────────────────────────────────────────────
            } else if (file.name.match(/\.(xls|xlsx)$/i)) {
                setProgress("Reading Excel file...");
                const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
                newWorkbook = wb;
                extractedRows = [];
                for (const sheetName of wb.SheetNames) {
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as any[][];
                    if (wb.SheetNames.length > 1) extractedRows.push([`--- ${sheetName} ---`]);
                    extractedRows.push(...rows);
                }

                // ── HTML ──────────────────────────────────────────────────────────────
            } else if (file.name.match(/\.html?$/i)) {
                setProgress("Parsing HTML tables...");
                const doc = new DOMParser().parseFromString(await file.text(), "text/html");
                const tables = doc.querySelectorAll("table");
                if (tables.length === 0) throw new Error("No tables found in HTML file.");
                extractedRows = [];
                tables.forEach((table, ti) => {
                    if (tables.length > 1) extractedRows.push([`--- Table ${ti + 1} ---`]);
                    table.querySelectorAll("tr").forEach((tr) => {
                        extractedRows.push(Array.from(tr.querySelectorAll("td, th")).map((td) => td.textContent?.trim() ?? ""));
                    });
                    extractedRows.push([]);
                });
                const htmlSheet = XLSX.utils.aoa_to_sheet(extractedRows);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, htmlSheet, "HTML Tables");

            } else {
                throw new Error("Unsupported format. Supported: .pdf, .docx, .xls, .xlsx, .csv, .tsv, .html, .jpg, .png");
            }

            setPreviewData(extractedRows);
            setWorkbook(newWorkbook);
            setSuccess(true);
            setProgress("Conversion complete! Check the preview below.");

        } catch (err: any) {
            console.error("Conversion failed:", err);
            setError(err.message || "Failed to convert file.");
        } finally {
            setLoading(false);
        }
    };

    const downloadExcel = () => {
        if (!workbook || !file) return;
        XLSX.writeFile(workbook, `converted_${file.name.split(".")[0]}.xlsx`);
    };

    return (
        <div className="p-6">
            <h1 className="mb-6 text-3xl font-bold text-gray-900">Document Converter</h1>
            <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-md">
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-semibold text-gray-700">Convert Documents to Excel</h2>
                    <p className="text-sm text-gray-500">Supports PDF, Word, Excel, CSV, TSV, HTML, and Images (OCR)</p>
                </div>

                {!file ? (
                    <div className="mb-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:bg-gray-100">
                        <Upload className="mb-4 h-12 w-12 text-gray-400" />
                        <label className="cursor-pointer">
                            <span className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700">Select File</span>
                            <input type="file" className="hidden"
                                accept=".docx,.pdf,.xls,.xlsx,.csv,.tsv,.html,.htm,.png,.jpg,.jpeg"
                                onChange={handleFileChange} />
                        </label>
                        <p className="mt-2 text-sm text-gray-500">No file selected</p>
                    </div>
                ) : (
                    <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="h-8 w-8 text-blue-600" />
                                <div>
                                    <p className="font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                                </div>
                            </div>
                            <button onClick={clearFile} className="text-gray-400 hover:text-red-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {previewUrl && (
                            <div className="mt-4 flex flex-col items-center">
                                <div className="relative overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
                                    <img src={previewUrl} alt="Preview"
                                        className="max-h-64 object-contain transition-transform duration-300"
                                        style={{ transform: `rotate(${rotation}deg)` }} />
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <button onClick={() => rotateImage(-90)} className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                                        <RotateCcw className="h-3 w-3" /> Rotate Left
                                    </button>
                                    <button onClick={() => rotateImage(90)} className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                                        <RotateCw className="h-3 w-3" /> Rotate Right
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-amber-600">* Rotate image until text is upright before converting</p>
                            </div>
                        )}
                    </div>
                )}

                {loading && <div className="mb-4 text-center text-sm text-blue-600 animate-pulse font-medium">{progress}</div>}

                {error && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
                        <AlertCircle className="h-5 w-5" /><span>{error}</span>
                    </div>
                )}

                {!success && file && (
                    <button onClick={processConversion} disabled={loading}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-all ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-md"}`}>
                        {loading ? <span>Processing...</span> : <><RotateCw className="h-5 w-5" /> Convert to Excel</>}
                    </button>
                )}

                {success && previewData && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 p-4 text-green-700">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                <span className="font-medium">Conversion successful!</span>
                            </div>
                            <button onClick={downloadExcel}
                                className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700">
                                <Download className="h-4 w-4" /> Download .xlsx
                            </button>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50">
                            <div className="border-b border-gray-200 bg-white px-4 py-3">
                                <h3 className="font-semibold text-gray-700">Data Preview (First 50 rows)</h3>
                            </div>
                            <div className="max-h-96 overflow-auto p-4 w-full">
                                <table className="min-w-full w-max border-collapse bg-white text-sm">
                                    <tbody>
                                        {previewData.slice(0, 50).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="border-r border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-400 w-8 text-center select-none">{rowIndex + 1}</td>
                                                {row.map((cell: any, cellIndex: number) => (
                                                    <td key={cellIndex} className="px-4 py-2 text-gray-700 border-r border-gray-100 last:border-0">{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 50 && <p className="mt-4 text-center text-xs text-gray-500">... and {previewData.length - 50} more rows.</p>}
                                {previewData.length === 0 && <p className="text-center text-gray-500 italic py-8">No text extracted.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
