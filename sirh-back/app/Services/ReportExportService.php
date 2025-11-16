<?php

namespace App\Services;

use App\Exports\AnalyticsExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Response;
use Maatwebsite\Excel\Facades\Excel;

class ReportExportService
{
    public function stream(array $dataset, string $format, string $filename)
    {
        $format = strtolower($format);
        return match ($format) {
            'csv' => $this->streamCsv($dataset, $filename),
            'xlsx', 'xls', 'excel' => $this->streamExcel($dataset, $filename),
            'pdf' => $this->streamPdf($dataset, $filename),
            default => throw new \InvalidArgumentException('Format non supporté'),
        };
    }

    protected function streamCsv(array $dataset, string $filename)
    {
        $headings = $dataset['headings'];
        $rows = $dataset['rows'];

        return Response::streamDownload(function () use ($headings, $rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headings);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, sprintf('%s.csv', $filename), ['Content-Type' => 'text/csv']);
    }

    protected function streamExcel(array $dataset, string $filename)
    {
        $export = new AnalyticsExport($dataset['headings'], $dataset['rows']);
        return Excel::download($export, sprintf('%s.xlsx', $filename));
    }

    protected function streamPdf(array $dataset, string $filename)
    {
        $pdf = Pdf::loadView('reports.analytics', [
            'headings' => $dataset['headings'],
            'rows' => $dataset['rows'],
        ])->setPaper('a4', 'landscape');

        return $pdf->download(sprintf('%s.pdf', $filename));
    }
}
