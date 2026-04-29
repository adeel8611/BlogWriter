const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const ragService = require('../rag/rag.service');

class DocumentService {
  /**
   * Extract text from uploaded file
   */
  async extractTextFromFile(filePath, mimeType) {
    try {
      let text = '';

      switch (mimeType) {
        case 'application/pdf':
          text = await this.extractFromPDF(filePath);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          text = await this.extractFromWord(filePath);
          break;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          text = await this.extractFromExcel(filePath);
          break;
        case 'text/plain':
        case 'text/csv':
          text = fs.readFileSync(filePath, 'utf-8');
          break;
        case 'application/json':
          text = JSON.stringify(JSON.parse(fs.readFileSync(filePath, 'utf-8')), null, 2);
          break;
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      return text;
    } catch (error) {
      console.error('Error extracting text from file:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF
   */
  async extractFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  /**
   * Extract text from Word document
   */
  async extractFromWord(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  /**
   * Extract text from Excel file
   */
  async extractFromExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    let text = '';

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      text += `Sheet: ${sheetName}\n`;
      jsonData.forEach(row => {
        text += row.join('\t') + '\n';
      });
      text += '\n';
    });

    return text;
  }

  /**
   * Process and store document in RAG
   */
  async processAndStoreDocument(projectId, filePath, fileName, mimeType, userId = null) {
    try {
      console.log(`Processing document: ${fileName}`);

      // Extract text from file
      const text = await this.extractTextFromFile(filePath, mimeType);

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      console.log(`Extracted ${text.length} characters from ${fileName}`);

      // Chunk the text
      const chunks = this.chunkText(text, 1000);
      console.log(`Created ${chunks.length} chunks from ${fileName}`);

      // Store chunks in RAG
      let storedCount = 0;
      for (const chunk of chunks) {
        await ragService.storeDocument(projectId, chunk, 'crawl', {
          source_file: fileName,
          file_type: mimeType,
          chunk_index: storedCount
        }, userId);
        storedCount++;
      }

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      return {
        success: true,
        fileName,
        extractedChars: text.length,
        chunksStored: storedCount,
        message: `Successfully processed ${fileName}: extracted ${text.length} characters into ${storedCount} chunks`
      };
    } catch (error) {
      console.error('Error processing document:', error);

      // Clean up the uploaded file even if processing failed
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      throw error;
    }
  }

  /**
   * Chunk text into smaller pieces
   */
  chunkText(text, chunkSize = 1000) {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes() {
    return [
      { mime: 'application/pdf', extension: '.pdf', name: 'PDF Document' },
      { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx', name: 'Word Document' },
      { mime: 'application/msword', extension: '.doc', name: 'Word Document (Legacy)' },
      { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: '.xlsx', name: 'Excel Spreadsheet' },
      { mime: 'application/vnd.ms-excel', extension: '.xls', name: 'Excel Spreadsheet (Legacy)' },
      { mime: 'text/plain', extension: '.txt', name: 'Plain Text' },
      { mime: 'text/csv', extension: '.csv', name: 'CSV File' },
      { mime: 'application/json', extension: '.json', name: 'JSON File' }
    ];
  }
}

module.exports = new DocumentService();
