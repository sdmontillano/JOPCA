// src/utils/csvUtils.js

/**
 * Escape a CSV value to prevent CSV injection attacks.
 * Wraps values containing commas, quotes, or newlines in quotes,
 * and escapes internal quotes by doubling them.
 */
export function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of arrays to CSV string with proper escaping.
 */
export function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

/**
 * Download data as a CSV file.
 */
export function downloadCsv(rows, filename) {
  const csvContent = toCsv(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
