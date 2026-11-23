# encoding: UTF-8
require 'fileutils'

target_dir = "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET"
md_path = "#{target_dir}/GUION_DE_EXPOSICION_PRESENTACION_PET_CT.md"
html_path = "#{target_dir}/GUION_DE_EXPOSICION_PRESENTACION_PET_CT.html"
pdf_path = "#{target_dir}/GUION_DE_EXPOSICION_PRESENTACION_PET_CT.pdf"

md_content = File.read(md_path, encoding: "UTF-8")

lines = md_content.split("\n")
html = []
in_table = false
in_code = false
in_blockquote = false

lines.each do |line|
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
    if in_code
      html << "</code></pre>"
      in_code = false
    else
      html << "<pre><code>"
      in_code = true
    end
    next
  end

  if in_code
    html << line.gsub("<", "&lt;").gsub(">", "&gt;")
    next
  end

  if l.start_with?("> ")
    quote_text = l[2..-1]
    if !in_blockquote
      html << "<blockquote>"
      in_blockquote = true
    end
    html << "<p>#{quote_text}</p>"
    next
  else
    if in_blockquote
      html << "</blockquote>"
      in_blockquote = false
    end
  end

  if l.start_with?("# ")
    html << "<h1>#{l[2..-1]}</h1>"
  elsif l.start_with?("## ")
    html << "<h2>#{l[3..-1]}</h2>"
  elsif l.start_with?("### ")
    html << "<h3>#{l[4..-1]}</h3>"
  elsif l.start_with?("#### ")
    html << "<h4>#{l[5..-1]}</h4>"
  elsif l.start_with?("* ") || l.start_with?("- ") || l.start_with?("• ")
    text = l.sub(/^[*•\-]\s*/, "")
    html << "<li>#{text}</li>"
  elsif l.start_with?("---")
    html << "<hr>"
  elsif l.empty?
    html << "<div class=\"spacer\"></div>"
  else
    html << "<p>#{l}</p>"
  end
end

if in_table
  html << "</tbody></table></div>"
end
if in_blockquote
  html << "</blockquote>"
end
if in_code
  html << "</code></pre>"
end

body = html.join("\n")
# Basic Markdown inlines
body.gsub!(/\*\*(.*?)\*\*/, "<strong>\\1</strong>")
body.gsub!(/\*(.*?)\*/, "<em>\\1</em>")
body.gsub!(/`([^`]+)`/, "<code>\\1</code>")

doc = <<~HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Guión de Exposición: Ecosistema Digital PET/CT | Galaria · SERGAS</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 14mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 10pt;
      margin: 0;
      padding: 20px;
      background: #f8fafc;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    }
    .header-bar {
      border-bottom: 3px solid #007eb4;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .institution-tag {
      font-size: 8.5pt;
      font-weight: 800;
      color: #007eb4;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h1 {
      font-size: 18pt;
      color: #004868;
      margin: 8px 0 4px 0;
      line-height: 1.2;
    }
    h2 {
      font-size: 12.5pt;
      color: #007eb4;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 5px;
      margin-top: 22px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      color: #0f172a;
      margin-top: 16px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    h4 {
      font-size: 10pt;
      color: #334155;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    p { margin: 5px 0; }
    strong { color: #0f172a; }
    blockquote {
      background: #f0f7fb;
      border-left: 4px solid #007eb4;
      margin: 10px 0;
      padding: 10px 16px;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      color: #08293d;
      font-size: 9.5pt;
    }
    blockquote p { margin: 3px 0; }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 8pt;
      font-family: "JetBrains Mono", Menlo, Consolas, monospace;
      overflow-x: auto;
      line-height: 1.4;
      margin: 10px 0;
    }
    code {
      background: #e2e8f0;
      color: #0f172a;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 8.5pt;
      font-family: Menlo, monospace;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    .table-container { margin: 14px 0; overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
    }
    th {
      background: #e6f4fa;
      color: #004868;
      font-weight: 700;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 18px 0;
    }
    li {
      margin-left: 18px;
      margin-bottom: 3px;
    }
    .spacer { height: 4px; }
    @media print {
      body { background: #fff; padding: 0; }
      .container { box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="institution-tag">Xunta de Galicia · Servizo Galego de Saúde (SERGAS) · Galaria</div>
      <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">Documento Oficial del Ponente · Sesión Clínica de Medicina Nuclear</div>
    </div>
    #{body}
  </div>
</body>
</html>
HTML

File.write(html_path, doc)
puts "HTML generado en: #{html_path}"

cmd = %Q("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --print-to-pdf="#{pdf_path}" --no-pdf-header-footer "#{html_path}")
puts "Generando PDF con Chrome..."
system(cmd)
puts "PDF generado en: #{pdf_path}"

