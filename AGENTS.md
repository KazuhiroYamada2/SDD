# Customer Management Practice

## Source of truth

実装前に必ず以下を読むこと。

1. specs/01-principle-definition.md
2. specs/02-planning-requirement.md
3. specs/03-design-planning.md
4. specs/04-task-breakdown.md

優先順位は 01 → 02 → 03 → 04 とする。

## Rules

- 仕様にない機能を勝手に追加しない
- 不明点や仕様矛盾を発見した場合、コードで推測して解決せず報告する
- 01-principle-definition.md は明示指示なしに変更しない
- 1回の実装は04-task-breakdown.mdの1タスクを基本とする
- 実装後は関連するテストを作成する
- テストが成功してから完了とする
- 実装内容を specs/05-implementation.md に記録する
- 受入確認結果を specs/06-verification-acceptance.md に記録する
- モバイルアプリ、外部システム連携、高度分析はPhase 1では実装しない

## Testing

Unit/Integration:
- backend tests
- frontend tests

Acceptance/E2E:
- Playwright

変更完了時に実施したテストと結果を報告する。