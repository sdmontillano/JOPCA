import { Button, Menu, MenuItem } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useState } from "react";
import { downloadCsv } from "../utils/csvUtils";

export default function ExportButtons({ data, filename, label = "Export" }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleExport = (format) => {
    setAnchorEl(null);
    
    if (!data || data.length === 0) {
      alert("No data to export");
      return;
    }

    if (format === "csv") {
      const headers = Object.keys(data[0]).filter(k => k !== "raw");
      const rows = data.map(item => 
        headers.map(h => item[h])
      );
      downloadCsv([headers, ...rows], `${filename}.csv`);
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
