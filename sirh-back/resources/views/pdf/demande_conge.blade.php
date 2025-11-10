<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Demande de congé</title>
    <style>
        @page { size: A4; margin: 0; }
        html, body {
            width: 210mm; height: 297mm;
            margin: 0; padding: 0;
        }
        body {
            font-family: DejaVu Sans, sans-serif;
            background-image: url('{{ public_path('images/letter.jpg') }}');
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center center;
            box-sizing: border-box;
        }

        .wid { width: 85%; margin: 0 auto; }
        .title { 
            margin-top: 200px;
            font-size: 22px; font-weight: bold; 
            text-align: center; margin-bottom: 30px;
        }
        .center { text-align: center; }

        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td {
            padding: 6px;
            vertical-align: top;
            border: none; 
            width:50% /* pas de bordures */
        }
        .left { text-align: left; }
        .right { text-align: left; }
        .label { font-weight: bold; margin-right: 6px; white-space: nowrap; }
        .value { word-break: break-word; }
        .signature-center { text-align: center; margin-top: 40px; }
        .signature-img { width: 200px; margin-top: 10px; }
    </style>
</head>
<body>
@php
    $reprise = isset($dateReprise)
        ? \Carbon\Carbon::parse($dateReprise)
        : \Carbon\Carbon::parse($conge->dateFin)->addDay();
@endphp

<div class="wid">
    <div class="title">Demande de congé</div>

    <div class="center" style="margin-bottom: 20px;">
        Tanger le, {{ \Carbon\Carbon::parse($conge->created_at)->format('d/m/Y') }}
    </div>

    <!-- Identité -->
    <table>
        <tr>
            <td class="left" style="width: 50%;">
                <span class="label">Nom:</span> <span class="value">{{ $conge->user->name }}</span>
            </td>
            <td class="right" style="width: 50%;">
                <span class="label">Prénom:</span> <span class="value">{{ $conge->user->prenom }}</span>
            </td>
        </tr>
     
    </table>
<table>
       <tr>
            <td class="left" style="width: 100%;">
                <span class="label">Fonction:</span> <span class="value">{{ $conge->user->fonction }}</span>
            <td>
        </tr>
</table>
    <!-- Période -->
    <table>
        <tr>
            <td class="left">
                <span class="label">Début:</span> 
                <span class="value">{{ \Carbon\Carbon::parse($conge->dateDebut)->format('d/m/Y') }}</span>
            </td>
            <td class="right">
                <span class="label">Fin:</span> 
                <span class="value">{{ \Carbon\Carbon::parse($conge->dateFin)->format('d/m/Y') }}</span>
            </td>
        </tr>
        <tr>
            <td class="left">
                <span class="label">Date de reprise:</span> 
                <span class="value">{{ $reprise->format('d/m/Y') }}</span>
            </td>
            <td></td>
        </tr>
    </table>

    <!-- Durées -->
    <table>
        <tr>
            <td class="left">
                <span class="label">Durée demandée:</span>
                <span class="value">
                    {{ isset($nbJoursTotal) 
                        ? $nbJoursTotal 
                        : (\Carbon\Carbon::parse($conge->dateDebut)->diffInDays(\Carbon\Carbon::parse($conge->dateFin)) + 1) }} jours
                </span>
            </td>
            <td class="right">
                <span class="label">Durée effective:</span>
                <span class="value">
                    {{ isset($nbJoursConge) 
                        ? $nbJoursConge 
                        : ((isset($nbJoursTotal) ? $nbJoursTotal : 0) - (isset($nbJoursFeries) ? $nbJoursFeries : 0)) }} jours
                </span>
            </td>
        </tr>
        @if(isset($nbJoursFeries))
        <tr>
            <td class="left">
                <span class="label">Jours fériés (exclus):</span>
                <span class="value">
                    {{ $nbJoursFeries }} {{ $nbJoursFeries > 1 ? 'jours' : 'jour' }}
                </span>
            </td>
            <td></td>
        </tr>
        @endif
    </table>

    <!-- Détail jours fériés -->
    @if(!empty($joursFeriesPeriode))
    <table style="font-size: 12px;">
        <tr>
            <td class="left">
                <span class="label">Détail jours fériés:</span>
                 @foreach($joursFeriesPeriode as $jf)
                    <span class="value">{{ \Carbon\Carbon::parse($jf)->format('d/m/Y') }}</span>&nbsp;
                @endforeach
            </td>
           
        </tr>
    </table>
    @endif

    <!-- Signature -->
    <div class="signature-center">
        Directeur des Ressources Humaines <br>
        Chafik Harti Mekrai<br>
        @if($user->societe_id == 2)
            <img src="{{ public_path('images/sign.jpg') }}" class="signature-img" alt="Signature">
        @endif
    </div>
</div>
</body>
</html>
