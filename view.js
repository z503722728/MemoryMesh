#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open'; // We'll need to install this dependency

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlFilePath = path.join(__dirname, 'MemoryViewer.html');

(async () => {
  try {
    await open(htmlFilePath);
    console.log(`已在浏览器中打开 MemoryViewer.html`);
  } catch (error) {
    console.error(`打开文件时出错: ${error}`);
    // Try a simpler open, which might work on some systems if the above fails due to permissions or specific browser issues.
    try {
        const { exec } = await import('child_process');
        let command = '';
        switch (process.platform) {
            case 'darwin': // macOS
                command = `open "${htmlFilePath}"`;
                break;
            case 'win32': // Windows
                command = `start "" "${htmlFilePath}"`; // start needs an empty title for paths with spaces
                break;
            default: // Linux, Unix-like
                command = `xdg-open "${htmlFilePath}"`;
                break;
        }
        exec(command, (err) => {
            if (err) {
                console.error(`备用打开方式也失败了: ${err}`);
                console.log(`请手动在浏览器中打开以下文件路径: ${htmlFilePath}`);
            } else {
                console.log("已尝试使用系统默认方式打开 MemoryViewer.html");
            }
        });
    } catch (backupError) {
        console.error(`执行备用打开方式时出错: ${backupError}`);
        console.log(`请手动在浏览器中打开以下文件路径: ${htmlFilePath}`);
    }
  }
})(); 