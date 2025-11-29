<?php
// Simple server-rendered preview page demonstrating catalog images and theme
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DASHEL - Server-rendered Catalog Preview</title>
  <link rel="stylesheet" href="../frontend/assets/css/main.css">
</head>
<body class="catalog-theme">
  <div style="max-width:1100px;margin:28px auto;padding:16px;">
    <h1 style="font-family: Montserrat, sans-serif;">Server-rendered Catalog Preview</h1>
    <p>This page demonstrates the same product images and lightbox behavior in a backend-rendered template.</p>

    <div class="catalog-wrapper">
      <div class="catalog-hero">
        <h2 class="catalog-title">HARDWARE PRODUCTS</h2>
        <div class="catalog-subtitle">SERVER PREVIEW</div>
      </div>

      <div class="catalog-container">
        <div class="catalog-grid">
          <?php
            $products = [
              ['img' => '../frontend/assets/images/product-hammer.svg','title'=>'Hammer Drill','price'=>'KSh 899.99'],
              ['img' => '../frontend/assets/images/product-drill.svg','title'=>'Circular Saw','price'=>'KSh 899.99'],
              ['img' => '../frontend/assets/images/product-saw.svg','title'=>'Angle Grinder','price'=>'KSh 899.99'],
            ];

            foreach ($products as $p) {
              echo '<div class="catalog-card">';
              echo '<div class="image-wrap">';
              echo '<img src="' . htmlspecialchars($p['img']) . '" alt="' . htmlspecialchars($p['title']) . '" class="product-image" data-lightbox="true" data-caption="' . htmlspecialchars($p['title'] . ' — ' . $p['price']) . '">';
              echo '</div>';
              echo '<div class="card-title-band">' . htmlspecialchars($p['title']) . '</div>';
              echo '<div class="card-desc">Sample server-rendered description.</div>';
              echo '<div class="price-badge">' . htmlspecialchars($p['price']) . '</div>';
              echo '</div>';
            }
          ?>
        </div>
      </div>
    </div>
  </div>

  <script src="../frontend/assets/js/scroll-animations.js"></script>
</body>
</html>
