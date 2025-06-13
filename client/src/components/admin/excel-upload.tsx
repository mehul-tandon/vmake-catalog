import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { utils, writeFile } from "xlsx";

export default function ExcelUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("excel", file);
      
      // Log file details for debugging
      console.log("Uploading file:", file.name, file.type, `${Math.round(file.size / 1024)} KB`);
      
      const response = await fetch("/api/products/upload-excel", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      if (data.imported === 0 && data.total > 0) {
        toast({
          title: "Warning: No Products Imported",
          description: `${data.imported} products imported from ${data.total} rows. Check that your file has name and code columns.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Successful",
          description: `${data.imported} products imported from ${data.total} rows`,
        });
      }
      
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    // Check for Excel or CSV files
    const isExcel = file.type.includes("sheet") || 
                    file.name.endsWith(".xlsx") || 
                    file.name.endsWith(".xls");
    const isCsv = file.type.includes("csv") || file.name.endsWith(".csv");

    if (!isExcel && !isCsv) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)",
        variant: "destructive",
      });
      return;
    }

    // 100MB limit (matching server configuration)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    setUploadProgress(50);
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Generate and download sample Excel file
  const downloadSampleExcel = () => {
    // Create workbook and worksheet
    const wb = utils.book_new();
    const wsData = [
      ["name", "code", "category", "length", "breadth", "height", "finish", "material", "imageUrl"],
      ["Dining Table", "DT001", "Furniture", "120", "80", "75", "Matte", "Wood", "https://example.com/image.jpg"],
      ["Coffee Table", "CT001", "Furniture", "90", "60", "45", "Glossy", "Glass", ""],
      ["Sofa", "SF001", "Seating", "200", "90", "85", "Fabric", "Leather", ""]
    ];
    
    const ws = utils.aoa_to_sheet(wsData);
    utils.book_append_sheet(wb, ws, "Sample");
    
    // Generate Excel file and trigger download
    writeFile(wb, "product_import_sample.xlsx");
    
    toast({
      title: "Sample Excel Downloaded",
      description: "Use this template to prepare your product data"
    });
  };
  
  // Generate and download sample CSV file
  const downloadSampleCsv = () => {
    // Create CSV content
    const csvContent = [
      "name,code,category,length,breadth,height,finish,material,imageUrl",
      "Dining Table,DT001,Furniture,120,80,75,Matte,Wood,https://example.com/image.jpg",
      "Coffee Table,CT001,Furniture,90,60,45,Glossy,Glass,",
      "Sofa,SF001,Seating,200,90,85,Fabric,Leather,"
    ].join("\n");
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "product_import_sample.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Sample CSV Downloaded",
      description: "Use this template to prepare your product data"
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black-secondary border-black-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Data Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? "border-gold bg-gold bg-opacity-10" 
                : "border-gold"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileSpreadsheet className="w-12 h-12 text-gold mx-auto mb-4" />
            <p className="text-white mb-2">Drop your Excel or CSV file here or click to browse</p>
            <p className="text-gray-400 text-sm mb-4">Supports .xlsx, .xls, .csv files up to 100MB</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? "Uploading..." : "Select File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
          
          {uploadProgress > 0 && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-400 mt-2">
                {uploadMutation.isPending ? "Processing..." : "Upload complete"}
              </p>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-400">
            <p>
              Last sync: <span className="text-gold">Just now</span> - 
              <span className="text-green-400 ml-1">Ready for new uploads</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black-secondary border-black-accent">
        <CardHeader>
          <CardTitle className="text-white">File Format Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-2">Required Columns:</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• <span className="text-gold">name</span> - Product name</li>
                <li>• <span className="text-gold">code</span> - Unique product code</li>
                <li>• <span className="text-gold">category</span> - Product category</li>
                <li>• <span className="text-gold">length</span> - Length in cm</li>
                <li>• <span className="text-gold">breadth</span> - Breadth in cm</li>
                <li>• <span className="text-gold">height</span> - Height in cm</li>
                <li>• <span className="text-gold">finish</span> - Product finish</li>
                <li>• <span className="text-gold">material</span> - Product material</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Optional Columns:</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• <span className="text-gold">imageUrl</span> - Product image URL</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-black-accent">
              <h4 className="font-semibold text-white mb-2">CSV Import Note:</h4>
              <p className="text-gray-400">
                When using CSV files, ensure your column headers match exactly: 
                <span className="text-gold">"name", "code", "category", "length", "breadth", "height", "finish", "material"</span>.
                CSV is case sensitive.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Supported Formats:</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Excel (.xlsx, .xls)</li>
                <li>• CSV (.csv)</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-black-accent mt-4">
              <h4 className="font-semibold text-white mb-2">Download Sample Files:</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={downloadSampleExcel}
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold hover:text-black-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Sample Excel File
                </Button>
                <Button
                  onClick={downloadSampleCsv}
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold hover:text-black-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Sample CSV File
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
