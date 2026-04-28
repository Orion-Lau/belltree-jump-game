# 鈴鈴村跳跳冒險

一個 Phaser 橫向平台跳躍網頁遊戲原型。主角是 AI 生成的原創「村務小狗助理」，玩法包含跑跳、收集鈴鐺與信件、踩掉雜草怪、抵達終點告示牌。

## 執行

```powershell
& "C:\Users\36088\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\scripts\server.mjs
```

本機打開：

```text
http://127.0.0.1:5173
```

手機或其他設備要在同一個 Wi-Fi / 區域網路，打開伺服器輸出的 `http://你的電腦IP:5173`。例如：

```text
http://10.8.0.234:5173
```

如果連不上，通常是 Windows 防火牆需要允許 Node.js 在私人網路上通訊。

## 操作

- 鍵盤：方向鍵或 A/D 移動，空白鍵跳躍，Shift 衝刺，R 重新開始。
- 手機：畫面底部左側控制左右，右側控制跳躍與衝刺。
