<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #222; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #f2f2f2; text-align: left; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        small { color: #6c757d; }
    </style>
</head>
<body>
    <h1>Rapport analytique</h1>
    <small>Généré le {{ now()->format('d/m/Y H:i') }}</small>

    <table>
        <thead>
            <tr>
                @foreach($headings as $heading)
                    <th>{{ $heading }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($row as $value)
                        <td>{{ $value }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($headings) }}" style="text-align:center; padding:24px;">Aucune donnée disponible</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
