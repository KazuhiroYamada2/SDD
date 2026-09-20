# Customer Management Practice

## Source of Truth

このプロジェクトの正本は `examples/` 配下の以下の6ファイルとする。

1. `examples/01-principle-definition.md` — プロジェクト原則・目的・スコープ
2. `examples/02-planning-requirement.md` — 機能要件・非機能要件（何を実現するか）
3. `examples/03-design-planning.md` — 設計・技術方式（どのように実現するか）
4. `examples/04-task-breakdown.md` — 実装タスク（どの単位で実装するか）
5. `examples/05-implementation.md` — 実際に実装した内容の記録
6. `examples/06-verification-acceptance.md` — 実際の検証・受入確認結果の記録

優先順位は `examples/01-principle-definition.md` → `examples/02-planning-requirement.md` → `examples/03-design-planning.md` → `examples/04-task-breakdown.md` → 実装コード → `examples/05-implementation.md` → `examples/06-verification-acceptance.md` とする。実装コードは01～04に基づいて作成する。05と06は実績記録であり、01～04の仕様を上書きしない。

## 作業ルール

- 実装前に必ず `examples/01-principle-definition.md`、`examples/02-planning-requirement.md`、`examples/03-design-planning.md`、`examples/04-task-breakdown.md` を確認する。
- 仕様にない機能を推測で追加しない。
- 実装に必要な情報が不足している場合は、勝手に仕様を補完せず作業を停止して報告する。
- 01～04の間、または仕様と既存コードに矛盾がある場合は、勝手にどちらかを選択せず報告する。
- `examples/01-principle-definition.md` は明示的な指示なしに変更しない。
- `examples/02-planning-requirement.md`、`examples/03-design-planning.md`、`examples/04-task-breakdown.md` も実装都合だけで変更しない。
- 原則として `examples/04-task-breakdown.md` に定義されたレビュー可能なタスク単位で実装する。
- 実装した機能に必要なunit・integration・component・E2Eテストを追加し、実際に実行する。テスト成功後に完了とする。
- 実装完了後、必要に応じて実際に行った内容を `examples/05-implementation.md` に記録する。未実施の内容は書かない。
- 検証完了後、必要に応じて実際の結果を `examples/06-verification-acceptance.md` に記録する。未実施のテストをPASSとして記録しない。
- Playwright受入テストでは `examples/02-planning-requirement.md`、`examples/03-design-planning.md`、`examples/04-task-breakdown.md` を参照し、結果を `examples/06-verification-acceptance.md` に記録する。
- モバイルアプリ、外部システム連携、高度分析はPhase 1では実装しない。

## Testing

- Unit / Integration / Component: Backend・Frontendの関連テスト
- Acceptance / E2E: Playwright

変更完了時に実施したテストと結果を報告する。
