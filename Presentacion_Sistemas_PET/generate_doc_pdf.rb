#!/usr/bin/env ruby
# encoding: UTF-8

workspace = "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET"
target_dir = "#{workspace}/Presentacion_Sistemas_PET"
md_path = "#{target_dir}/DOCUMENTO_ECOSISTEMA_PET_CT.md"
html_path = "#{target_dir}/DOCUMENTO_ECOSISTEMA_PET_CT.html"
pdf_path = "#{target_dir}/DOCUMENTO_ECOSISTEMA_PET_CT.pdf"

md_content = File.read(md_path, encoding: 'UTF-8')

def md_to_html(md)
  lines = md.split("\n")
  html = []
  in_table = false
  in_list = false
  in_alert = false

  lines.each_with_index do |line, idx|
    l = line.strip

    if l.start_with?("|") && l.end_with?("|")
      next if l.include?("---")
      cols = l[1..-2].split("|").map(&:strip)
      if !in_table
        html << "<div class=\"table-container\"><table>"
        html << "<thead><tr>" + cols.map { |c| "<th>#{c}</th>" }.join + "</tr></thead><tbody>"
        in_table = true
      else
        html << "<tr>" + cols.map { |c| "<td>#{c}</td>" }.join + "</tr>"
      end
      next
    else
      if in_table
        html << "</tbody></table></div>"
        in_table = false
      end
    end

    if l.start_with?("```")
      if l == "```"
        html << "</pre>"
      else
        html << "<pre><code>"
      end
      next
    end

    if l.start_with?("# ")
      html << "<h1>#{l[2..-1]}</h1>"
    elsif l.start_with?("## ")
      html << "<h2>#{l[3..-1]}</h2>"
    elsif l.start_with?("### ")
      html << "<h3>#{l[4..-1]}</h3>"
    elsif l.start_with?("#### ")
      html << "<h4>#{l[5..-1]}</h4>"
    elsif l.start_with?("> [!")
      type = l.match(/> \[!(.*?)\]/)[1].downcase rescue "info"
      html << "<div class=\"alert alert-#{type}\">"
      in_alert = true
    elsif l.start_with?("> ")
      text = l[2..-1]
      html << "<p>#{text}</p>"
      next_line = lines[idx + 1] ? lines[idx + 1].strip : ""
      if !next_line.start_with?(">")
        html << "</div>"
        in_alert = false
      end
    elsif l.start_with?("![")
      alt = l.match(/!\[(.*?)\]/)[1] rescue "Captura"
      src = l.match(/\((.*?)\)/)[1] rescue ""
      html << "<div class=\"doc-image-box\"><img src=\"#{src}\" alt=\"#{alt}\"><div class=\"doc-image-caption\">📸 #{alt}</div></div>"
    elsif l.start_with?("* ") || l.start_with?("- ")
      if !in_list
        html << "<ul>"
        in_list = true
      end
      item = l[2..-1].gsub(/\*\*(.*?)\*\*/, '<strong>\1</strong>').gsub(/\*(.*?)\*/, '<em>\1</em>')
      html << "<li>#{item}</li>"
    elsif l.match(/^\d+\.\s/)
      item = l.sub(/^\d+\.\s/, '').gsub(/\*\*(.*?)\*\*/, '<strong>\1</strong>').gsub(/\*(.*?)\*/, '<em>\1</em>')
      html << "<p style=\"padding-left: 20px;\"><strong>#{l.match(/^\d+\./)[0]}</strong> #{item}</p>"
    elsif l.start_with?("---")
      html << "<hr>"
    elsif l.empty?
      if in_list
        html << "</ul>"
        in_list = false
      end
      if in_alert
        html << "</div>"
        in_alert = false
      end
    else
      if in_list
        html << "</ul>"
        in_list = false
      end
      p_text = l.gsub(/\*\*(.*?)\*\*/, '<strong>\1</strong>').gsub(/\*(.*?)\*/, '<em>\1</em>')
      html << "<p>#{p_text}</p>"
    end
  end

  html << "</tbody></table></div>" if in_table
  html << "</ul>" if in_list
  html << "</div>" if in_alert

  html.join("\n")
end

body_content = md_to_html(md_content)

html_document = <<~HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Dossier Oficial: Ecosistema Digital PET/CT & Medicina Nuclear - Galaria SERGAS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --sergas-blue: #007eb4;
      --sergas-blue-hover: #005b82;
      --sergas-navy: #004868;
      --sergas-dark: #08293d;
      --sergas-soft: #f0f7fb;
      --sergas-border: #d6e2e9;
      --text-main: #1e293b;
      --text-muted: #475569;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Open Sans', -apple-system, sans-serif;
      color: var(--text-main);
      background: #f8fafc;
      line-height: 1.65;
      font-size: 15px;
      padding: 40px 20px;
    }
    .page-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      padding: 60px 70px;
      border-radius: 12px;
      box-shadow: 0 4px 25px rgba(0, 40, 70, 0.08);
      border: 1px solid var(--sergas-border);
    }
    .doc-header-banner {
      border-bottom: 3px solid var(--sergas-blue);
      padding-bottom: 25px;
      margin-bottom: 35px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .doc-brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--sergas-blue);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-brand-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .btn-print {
      background: var(--sergas-blue);
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.9rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print:hover { background: var(--sergas-blue-hover); }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2.1rem;
      color: var(--sergas-navy);
      margin-bottom: 12px;
      line-height: 1.2;
    }
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.45rem;
      color: var(--sergas-navy);
      margin-top: 35px;
      margin-bottom: 15px;
      border-bottom: 1px solid var(--sergas-border);
      padding-bottom: 8px;
    }
    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      color: var(--sergas-blue);
      margin-top: 24px;
      margin-bottom: 10px;
    }
    p { margin-bottom: 14px; }
    ul { margin-bottom: 16px; padding-left: 24px; }
    li { margin-bottom: 8px; }
    hr { border: none; border-top: 1px solid var(--sergas-border); margin: 35px 0; }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      margin-bottom: 20px;
    }
    .doc-image-box {
      margin: 25px 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--sergas-border);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
      background: #08293d;
      text-align: center;
    }
    .doc-image-box img {
      width: 100%;
      height: auto;
      display: block;
    }
    .doc-image-caption {
      background: #f8fafc;
      padding: 10px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      border-top: 1px solid var(--sergas-border);
      text-align: left;
    }
    .table-container {
      overflow-x: auto;
      margin: 20px 0;
      border-radius: 8px;
      border: 1px solid var(--sergas-border);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th {
      background: var(--sergas-soft);
      color: var(--sergas-navy);
      font-weight: 700;
      text-align: left;
      padding: 12px 14px;
      border-bottom: 2px solid var(--sergas-border);
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--sergas-border);
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #fafcff; }
    .alert {
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid var(--sergas-blue);
      background: var(--sergas-soft);
      font-size: 0.92rem;
    }
    .alert-important, .alert-warning {
      border-left-color: #d97706;
      background: #fffbeb;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .page-container { box-shadow: none; border: none; padding: 0; }
      .btn-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="doc-header-banner">
      <div>
        <div class="doc-brand-title">XUNTA DE GALICIA · CONSELLERÍA DE SANIDADE · SERGAS</div>
        <div class="doc-brand-subtitle">Galaria · Empresa Pública de Servizos Sanitarios, S.A. | Unidade de Medicina Nuclear</div>
      </div>
      <div>
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
      </div>
    </div>
    #{body_content}
  </div>
</body>
</html>
HTML

File.write(html_path, html_document)
puts "Documento HTML generado en: #{html_path}"

cmd = %Q("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --print-to-pdf="#{pdf_path}" --no-pdf-header-footer "#{html_path}")
puts "Generando PDF con Google Chrome headless..."
system(cmd)
puts "Documento PDF generado con éxito en: #{pdf_path}"
