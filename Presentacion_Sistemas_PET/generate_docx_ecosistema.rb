#!/usr/bin/env ruby
# encoding: UTF-8
require 'fileutils'

workspace = "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET"
target_dir = "#{workspace}/Presentacion_Sistemas_PET"
md_path = "#{target_dir}/DOCUMENTO_ECOSISTEMA_PET_CT.md"
docx_out = "#{target_dir}/DOCUMENTO_ECOSISTEMA_PET_CT.docx"
build_dir = "#{target_dir}/docx_build"

FileUtils.rm_rf(build_dir)
FileUtils.mkdir_p("#{build_dir}/_rels")
FileUtils.mkdir_p("#{build_dir}/word/_rels")
FileUtils.mkdir_p("#{build_dir}/word/media")

md_content = File.read(md_path, encoding: 'UTF-8')

images_map = {}
image_counter = 0

# 1. Extraer imágenes del markdown y copiarlas
md_content.scan(/!\[(.*?)\]\((.*?)\)/) do |alt, src|
  img_file = File.basename(src)
  full_src = "#{target_dir}/#{src}"
  if File.exist?(full_src) && !images_map[src]
    image_counter += 1
    dst_name = "image#{image_counter}.png"
    FileUtils.cp(full_src, "#{build_dir}/word/media/#{dst_name}")
    images_map[src] = { rId: "rIdImg#{image_counter}", file: dst_name, alt: alt }
  end
end

# 2. Construir document.xml
doc_body = []

# Portada / Cabecera institucional
doc_body << <<~XML
  <w:p>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="007EB4"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
      <w:t>XUNTA DE GALICIA · CONSELLERÍA DE SANIDADE · SERGAS</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr>
    <w:r>
      <w:rPr><w:sz w:val="20"/><w:color w:val="526071"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
      <w:t>Galaria · Empresa Pública de Servizos Sanitarios, S.A. | Unidade de Medicina Nuclear</w:t>
    </w:r>
  </w:p>
XML

lines = md_content.split("\n")
in_table = false
table_rows = []

lines.each do |line|
  l = line.strip

  # Tablas
  if l.start_with?("|") && l.end_with?("|")
    next if l.include?("---")
    cols = l[1..-2].split("|").map(&:strip)
    table_rows << cols
    in_table = true
    next
  else
    if in_table
      # Renderizar tabla XML
      doc_body << "<w:tbl>"
      doc_body << "<w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D6E2E9\"/><w:bottom w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D6E2E9\"/><w:insideH w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D6E2E9\"/><w:insideV w:val=\"none\"/><w:left w:val=\"none\"/><w:right w:val=\"none\"/></w:tblBorders></w:tblPr>"
      table_rows.each_with_index do |row, r_idx|
        doc_body << "<w:tr>"
        row.each do |cell|
          bg = (r_idx == 0) ? "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"F0F7FB\"/>" : ""
          bold = (r_idx == 0) ? "<w:b/>" : ""
          color = (r_idx == 0) ? "<w:color w:val=\"004868\"/>" : "<w:color w:val=\"1E293B\"/>"
          doc_body << "<w:tc><w:tcPr>#{bg}<w:tcMar><w:top w:w=\"140\" w:type=\"dxa\"/><w:bottom w:w=\"140\" w:type=\"dxa\"/><w:left w:w=\"160\" w:type=\"dxa\"/><w:right w:w=\"160\" w:type=\"dxa\"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr>#{bold}#{color}<w:sz w:val=\"20\"/><w:rFonts w:ascii=\"Helvetica Neue\" w:hAnsi=\"Helvetica Neue\"/></w:rPr><w:t>#{cell.encode(xml: :text)}</w:t></w:r></w:p></w:tc>"
        end
        doc_body << "</w:tr>"
      end
      doc_body << "</w:tbl><w:p><w:pPr><w:spacing w:after=\"180\"/></w:pPr></w:p>"
      in_table = false
      table_rows = []
    end
  end

  next if l.start_with?("```")

  if l.start_with?("# ")
    doc_body << <<~XML
      <w:p>
        <w:pPr><w:spacing w:before="360" w:after="140"/><w:jc w:val="left"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="004868"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
          <w:t>#{l[2..-1].encode(xml: :text)}</w:t>
        </w:r>
      </w:p>
    XML
  elsif l.start_with?("## ")
    doc_body << <<~XML
      <w:p>
        <w:pPr><w:spacing w:before="300" w:after="120"/><w:jc w:val="left"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="007EB4"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
          <w:t>#{l[3..-1].encode(xml: :text)}</w:t>
        </w:r>
      </w:p>
    XML
  elsif l.start_with?("### ")
    doc_body << <<~XML
      <w:p>
        <w:pPr><w:spacing w:before="240" w:after="100"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="004868"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
          <w:t>#{l[4..-1].encode(xml: :text)}</w:t>
        </w:r>
      </w:p>
    XML
  elsif l.start_with?("![")
    # Imagen
    src = l.match(/\((.*?)\)/)[1] rescue nil
    alt = l.match(/!\[(.*?)\]/)[1] rescue "Captura"
    img_data = images_map[src]
    if img_data
      # Imagen en Word (inline DrawingML)
      doc_body << <<~XML
        <w:p>
          <w:pPr><w:spacing w:before="200" w:after="80"/><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:drawing>
              <wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="5760000" cy="3600000"/>
                <wp:docPr id="#{rand(1000..9999)}" name="#{alt.encode(xml: :text)}"/>
                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:nvPicPr>
                        <pic:cNvPr id="0" name="#{alt.encode(xml: :text)}"/>
                        <pic:cNvPicPr/>
                      </pic:nvPicPr>
                      <pic:blipFill>
                        <a:blip r:embed="#{img_data[:rId]}"/>
                        <a:stretch><a:fillRect/></a:stretch>
                      </pic:blipFill>
                      <pic:spPr>
                        <a:xfrm><a:off x="0" y="0"/><a:ext cx="5760000" cy="3600000"/></a:xfrm>
                        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                      </pic:spPr>
                    </pic:pic>
                  </a:graphicData>
                </a:graphic>
              </wp:inline>
            </w:drawing>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="526071"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
            <w:t>📸 #{alt.encode(xml: :text)}</w:t>
          </w:r>
        </w:p>
      XML
    end
  elsif l.start_with?("* ") || l.start_with?("- ")
    # Viñeta
    clean_text = l[2..-1].gsub(/\*\*(.*?)\*\*/, '\1')
    doc_body << <<~XML
      <w:p>
        <w:pPr><w:ind w:left="360" w:hanging="240"/><w:spacing w:after="80"/></w:pPr>
        <w:r><w:rPr><w:color w:val="007EB4"/></w:rPr><w:t>▪ </w:t></w:r>
        <w:r>
          <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
          <w:t>#{clean_text.encode(xml: :text)}</w:t>
        </w:r>
      </w:p>
    XML
  elsif l.start_with?("---")
    doc_body << "<w:p><w:pPr><w:pBdr><w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"1\" w:color=\"D6E2E9\"/></w:pBdr><w:spacing w:before=\"180\" w:after=\"180\"/></w:pPr></w:p>"
  elsif l.empty?
    next
  else
    clean_text = l.gsub(/\*\*(.*?)\*\*/, '\1')
    doc_body << <<~XML
      <w:p>
        <w:pPr><w:spacing w:after="140"/></w:pPr>
        <w:r>
          <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/><w:rFonts w:ascii="Helvetica Neue" w:hAnsi="Helvetica Neue"/></w:rPr>
          <w:t>#{clean_text.encode(xml: :text)}</w:t>
        </w:r>
      </w:p>
    XML
  end
end

# 3. Guardar archivos del paquete OpenXML (.docx)
# [Content_Types].xml
content_types = <<~XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
XML
File.write("#{build_dir}/[Content_Types].xml", content_types)

# _rels/.rels
File.write("#{build_dir}/_rels/.rels", <<~XML)
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
XML

# word/_rels/document.xml.rels
doc_rels = <<~XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
XML
images_map.each do |src, data|
  doc_rels << "<Relationship Id=\"#{data[:rId]}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"media/#{data[:file]}\"/>\n"
end
doc_rels << "</Relationships>\n"
File.write("#{build_dir}/word/_rels/document.xml.rels", doc_rels)

# word/document.xml
full_doc_xml = <<~XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    #{doc_body.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>
XML
File.write("#{build_dir}/word/document.xml", full_doc_xml)

# Empaquetar DOCX
system("cd \"#{build_dir}\" && zip -q -r \"#{docx_out}\" .")
puts "Documento DOCX generado con éxito en: #{docx_out}"
