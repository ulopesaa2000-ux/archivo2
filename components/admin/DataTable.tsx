// components/admin/DataTable.tsx
// Legacy re-export para backwards compatibility
// El DataTable real vive en components/admin/DataTable/DataTable.tsx

export {
  DataTable,
  DataTableProvider,
  useDataTableContext,
  useDataTableSelection,
  useDataTableExpand,
  useDataTableFeatures,
  BulkActionBar,
  QuickEditPopover,
  EmptyState,
} from './DataTable/DataTable'

export type {
  ColumnDef,
  TableFeatures,
  QuickEditField,
  BulkAction,
  FieldType,
} from './DataTable/types'