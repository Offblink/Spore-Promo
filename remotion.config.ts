import { Config } from '@remotion/cli/config';

// 输出格式 / 覆盖 / GL 后端（Edge 156 + angle 实测可用）
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(4);

// 本机不下载 chrome-headless-shell：显式指向已有的 Edge。
// CLI 亦可覆盖：--browser-executable="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
Config.setBrowserExecutable('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
