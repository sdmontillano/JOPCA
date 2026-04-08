import { Button, Menu, MenuItem } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useState } from "react";
import { downloadCsv } from "../utils/csvUtils";
import { useToast } from "../ToastContext";

export default function ExportButtons({ data, filename, label = "Export", columns = null }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { showToast } = useToast();

  const handleExport = (format) => {
    setAnchorEl(null);
    
    if (!data || data.length === 0) {
      showToast("No data to export", "warning");
      return;
    }

    if (format === "csv") {
      let headers, rows;
      
      if (columns) {
        // Custom column mapping provided
        headers = columns.map(col => col.label);
        rows = data.map(item => 
          columns.map(col => {
            const value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
            return value !== undefined ? value : "";
          })
        );
      } else {
        // Auto-detect columns from first item, excluding 'raw' and nested objects
        headers = Object.keys(data[0]).filter(k => k !== "raw" && typeof data[0][k] !== 'object');
        rows = data.map(item => 
          headers.map(h => {
            const value = item[h];
            return value !== undefined ? value : "";
          })
        );
      }
      
      downloadCsv([headers, ...rows], `${filename}.csv`);
      showToast("Report exported successfully!", "success");
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleExport("csv")}>Export as CSV</MenuItem>
      </Menu>
    </>
  );
}