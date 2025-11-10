<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Attestation de Travail</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: DejaVu Sans, sans-serif;
            background-image: url('{{ public_path('images/letter.jpg') }}');
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center center;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        .center { text-align: center; margin: 0; }
        .header-logos { text-align: center; margin-top: 120px; }
        .logo { height: 80px; object-fit: contain; }
        .cachet-img { width: 80px; margin-top: 10px; }
        table { width: 100%; }
        tr { text-align: center }
        .title{margin-top:200px}
        .wid{width:85%;text-align:justify;margin:auto;line-height:1.6}
        .signature-center { text-align: center; }
        .signature-img { width: 120px; margin-top: 10px; }

        p { line-height: 1.8; margin-bottom: 20px; }
.img {
    text-align: right !important;
    vertical-align: end;
    position:relative;
}
.img1 {
    text-align: left !important;
    position:absolute;
    vertical-align: start;
    top:-50%;
    right:0%
}    </style>
</head>
<body>
   <div class="wid">
    <h2 class="center title">ATTESTATION DE TRAVAIL</h2>
    <p>
        Je soussigné, Chafik Harti, agissant en qualité de Directeur des Ressources Humaines de la société
        <strong>
            @if($user->societe_id == 2)
                Dozal Cooling Towers
            @elseif($user->societe_id == 1)
                SMEE
            @endif
        </strong>,
        atteste par la présente que :
        <br>
        @if($user->sex == "H")
            Monsieur
        @elseif($user->sex == "F")
            Madame
        @else
            Monsieur / Madame
        @endif
        <strong>{{ $user->name }} {{ $user->prenom }}</strong>, titulaire de la CIN n° <strong>{{ $user->cin }}</strong>,  <br>
        est employé(e) au sein de notre entreprise depuis le <strong>{{ \Carbon\Carbon::parse($user->dateEmbauche)->format('d/m/Y') }}</strong>
        en qualité de <strong>{{ $user->fonction }}</strong>.
    </p>
    <p>
        La présente attestation est délivrée à la demande de l’intéressé(e), <br> pour servir et valoir ce que de droit.
    </p>
    <p>
        Fait à {{ $ville }}, le {{ $date }}
    </p>
    <div class="signature-cachet">
        <div class="signature-center">
            Directeur des Ressources Humaines <br>
            Chafik El Harti<br>
            @if($user->societe_id == 2)
                <img src="{{ public_path('images/sign.jpg') }}" class="signature-img" alt="Signature">
            @endif
        </div>
    </div>
    </div>
</body>
</html>
