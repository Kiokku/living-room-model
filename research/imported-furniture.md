# 家具代码来源

- 上游项目：https://github.com/wy51ai/floorplan-3d
- 来源版本：`a03136c86842968a3de5da4c33549d3df3313c51`
- 来源文件：[index.html](https://github.com/wy51ai/floorplan-3d/blob/a03136c86842968a3de5da4c33549d3df3313c51/index.html)
- 提取类别：`bed`、`nightstand`、`dresser`、`sofa`、`coffeetable`、`rug`、`floorlamp`、`plant`。
- `src/importedFurniture.js`：提取 `buildFurniture()` 对应分支及必要几何／材质辅助函数；移除上游场景坐标定位及渲染器环境依赖，由本项目编辑器决定位置。
- `src/furnitureLibrary.js`：对应目录默认尺寸、配色及 `furnSVG()` 二维图例；默认采用 1.8 m 双人床、三人沙发和普通绿植。
- 单位：目录与 SVG 使用 mm，三维几何与本项目坐标使用 m。
- 保留本项目原有 NORHOR 沙发；新增模型以独立模块接入同一编辑、保存和导出流程。

上游该版本未附 LICENSE。按用户明确要求复制并保留来源记录，此记录不构成上游的许可声明。
