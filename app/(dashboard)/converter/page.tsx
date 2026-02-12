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

    // Data Preview State
    const [previewData, setPreviewData] = useState<any[][] | null>(null);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

    // Image Rotation State
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

            // Create preview if image
            if (selectedFile.type.startsWith("image/")) {
                const url = URL.createObjectURL(selectedFile);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const rotateImage = (degrees: number) => {
        setRotation((prev) => (prev + degrees) % 360);
    };

    const clearFile = () => {
        setFile(null);
        setPreviewUrl(null);
        setRotation(0);
        setError(null);
        setSuccess(false);
        setPreviewData(null);
        setWorkbook(null);
    };

    // Helper to get rotated image blob
    const getRotatedImage = async (imageUrl: string, rotateDeg: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject("Canvas context error");

                // Handle dimension swapping for 90/270 degrees
                if (rotateDeg % 180 !== 0) {
                    canvas.width = img.height;
                    canvas.height = img.width;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotateDeg * Math.PI) / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject("Canvas to Blob failed");
                }, "image/png");
            };
            img.onerror = reject;
        });
    };

    const processConversion = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setPreviewData(null);
        setWorkbook(null);
        setProgress("Starting conversion...");

        try {
            let newWorkbook: XLSX.WorkBook;
            let extractedRows: any[][] = [];

            if (file.name.endsWith(".docx")) {
                const arrayBuffer = await file.arrayBuffer();
                setProgress("Extracting text from Word document...");
                const result = await mammoth.extractRawText({ arrayBuffer });
                const textContent = result.value;
                extractedRows = textContent.split("\n").map((line) => [line]);

                const worksheet = XLSX.utils.aoa_to_sheet(extractedRows);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, worksheet, "Converted");

            } else if (file.name.endsWith(".pdf")) {
                const arrayBuffer = await file.arrayBuffer();
                setProgress("Extracting text with layout preservation...");
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                extractedRows = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    setProgress(`Processing PDF Page ${i} of ${pdf.numPages}...`);
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();

                    // define types for our items
                    type TextItem = { str: string; x: number; y: number; width: number; height: number };

                    // 1. Map items to include simplified coordinates (PDF origin is bottom-left)
                    const items: TextItem[] = textContent.items
                        .filter((item: any) => item.str.trim().length > 0) // Filter empty items
                        .map((item: any) => {
                            // transform[4] is x, transform[5] is y
                            const tx = item.transform;
                            return {
                                str: item.str,
                                x: tx[4],
                                y: tx[5],
                                width: item.width,
                                height: item.height
                            };
                        });

                    // 2. Group by Y coordinate (Row Detection) with a tolerance
                    // Since PDF Y grows upwards, we sort descending for visual order
                    items.sort((a, b) => b.y - a.y);

                    const rows: TextItem[][] = [];
                    if (items.length > 0) {
                        let currentRow: TextItem[] = [items[0]];
                        let currentRowY = items[0].y;

                        for (let j = 1; j < items.length; j++) {
                            const item = items[j];
                            // If Y diff is small (e.g., < 5 units), consider same row
                            if (Math.abs(item.y - currentRowY) < 5) {
                                currentRow.push(item);
                            } else {
                                // New row detected
                                rows.push(currentRow);
                                currentRow = [item];
                                currentRowY = item.y;
                            }
                        }
                        rows.push(currentRow); // Push last row
                    }

                    // 3. Process each row: Sort by X and detect columns
                    const pageRows: string[][] = [];

                    // Add Page Header
                    pageRows.push([`--- Page ${i} ---`]);

                    for (const rowItems of rows) {
                        // Sort items left-to-right
                        rowItems.sort((a, b) => a.x - b.x);

                        const rowCells: string[] = [];
                        if (rowItems.length > 0) {
                            let currentCellText = rowItems[0].str;
                            let lastXEnd = rowItems[0].x + rowItems[0].width;

                            for (let k = 1; k < rowItems.length; k++) {
                                const item = rowItems[k];
                                const gap = item.x - lastXEnd;

                                // Threshold for new column (e.g., 20 units)
                                // Adjust this threshold based on typical column spacing
                                if (gap > 20) {
                                    rowCells.push(currentCellText);
                                    currentCellText = item.str;
                                } else {
                                    // Same cell, append with space
                                    currentCellText += " " + item.str;
                                }
                                lastXEnd = item.x + item.width;
                            }
                            rowCells.push(currentCellText); // Push last cell
                        }
                        pageRows.push(rowCells);
                    }

                    extractedRows.push(...pageRows);
                }

                // Calculate max columns to ensure valid sheet
                const maxCols = extractedRows.reduce((max, row) => Math.max(max, row.length), 0);
                // Pad rows so they all have same length (optional but good for consistency)
                const paddedRows = extractedRows.map(row => {
                    while (row.length < maxCols) row.push("");
                    return row;
                });

                const worksheet = XLSX.utils.aoa_to_sheet(paddedRows);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, worksheet, "PDF Data");

            } else if (file.name.match(/\.(jpg|jpeg|png)$/i)) {
                setProgress("Preparing image (rotating using canvas)...");

                // Use the rotated blob if preview exists
                const imageToProcess = previewUrl && rotation !== 0 ? await getRotatedImage(previewUrl, rotation) : file;

                setProgress("Initializing OCR engine (this may take a moment)...");

                const result = await Tesseract.recognize(
                    imageToProcess as any, // Tesseract accepts Blob/File
                    'eng',
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                setProgress(`OCR Scanning: ${(m.progress * 100).toFixed(0)}%`);
                            }
                        }
                    }
                );

                setProgress("Formatting extracted text...");
                const textContent = result.data.text;
                extractedRows = textContent.split("\n").map((line) => [line]);
                const worksheet = XLSX.utils.aoa_to_sheet(extractedRows);
                newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, worksheet, "OCR Data");

            } else {
                throw new Error("Unsupported file format. Please upload .docx, .pdf, .png, or .jpg");
            }

            // Set state for preview and download
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
                    <p className="text-sm text-gray-500">Supports .docx (Word), .pdf (PDF), and Images (OCR)</p>
                </div>

                {!file ? (
                    <div className="mb-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:bg-gray-100">
                        <Upload className="mb-4 h-12 w-12 text-gray-400" />
                        <label className="cursor-pointer">
                            <span className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700">
                                Select File
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".docx,.pdf,.png,.jpg,.jpeg"
                                onChange={handleFileChange}
                            />
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
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-h-64 object-contain transition-transform duration-300"
                                        style={{ transform: `rotate(${rotation}deg)` }}
                                    />
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => rotateImage(-90)}
                                        className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                                    >
                                        <RotateCcw className="h-3 w-3" /> Rotate Left
                                    </button>
                                    <button
                                        onClick={() => rotateImage(90)}
                                        className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                                    >
                                        <RotateCw className="h-3 w-3" /> Rotate Right
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-amber-600">
                                    * Rotate image until text is upright before converting
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="mb-4 text-center text-sm text-blue-600 animate-pulse font-medium">
                        {progress}
                    </div>
                )}

                {error && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Convert Button */}
                {!success && file && (
                    <button
                        onClick={processConversion}
                        disabled={loading}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-all ${loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 shadow-md"
                            }`}
                    >
                        {loading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <RotateCw className="h-5 w-5" /> {/* Using generic icon for 'Process' */}
                                Convert to Preview
                            </>
                        )}
                    </button>
                )}

                {/* Success & Preview Area */}
                {success && previewData && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 p-4 text-green-700">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                <span className="font-medium">Conversion successful!</span>
                            </div>
                            <button
                                onClick={downloadExcel}
                                className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700"
                            >
                                <Download className="h-4 w-4" />
                                Download .xlsx
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
                                                <td className="border-r border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-400 w-8 text-center select-none">
                                                    {rowIndex + 1}
                                                </td>
                                                {row.map((cell: any, cellIndex: number) => (
                                                    <td key={cellIndex} className="px-4 py-2 text-gray-700 border-r border-gray-100 last:border-0">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 50 && (
                                    <p className="mt-4 text-center text-xs text-gray-500">
                                        ... and {previewData.length - 50} more rows.
                                    </p>
                                )}
                                {previewData.length === 0 && (
                                    <p className="text-center text-gray-500 italic py-8">No text extracted.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
