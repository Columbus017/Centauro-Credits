import 'server-only'

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'

import { formatQCents } from '@/lib/format'
import { formatReportCell, isNumericColumn } from '@/lib/reports'
import type { ReportResult } from '@/lib/queries/reports'

/**
 * The three reports as `@react-pdf/renderer` documents.
 *
 * `ReportsPDF/*.php` concatenated an HTML string — with the row loop inside
 * the string — and handed it to a vendored mPDF that fetched Bootstrap and
 * W3.CSS from two CDNs at render time, so a PDF could not be produced without
 * outbound internet. Nothing here leaves the process.
 *
 * Only the standard PDF fonts are used. Helvetica covers WinAnsi, which covers
 * every accented character a Guatemalan name or a Spanish column heading needs,
 * and it keeps a font file out of the deployment.
 */

/** Every string the document shows, resolved by the caller. */
export type ReportPdfStrings = {
  brand: string
  heading: string
  /** The date range or single date under the heading, where the report has one. */
  subtitle: string | null
  generatedOn: string
  columns: string[]
  totalLabel: string | null
  empty: string
  page: (page: number, total: number) => string
}

/**
 * No hyphenation. The default callback is English and splits Spanish on rules
 * it does not have — a column heading came out as "Fecha de can-celación", and
 * a client's surname is not a word it may break either. Returning the word
 * whole makes a cell that will not fit wrap instead of hyphenate.
 */
Font.registerHyphenationCallback((word) => [word])

const INK = '#1d2128'

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 44,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: INK,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 6,
  },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  generatedOn: { fontSize: 9, color: '#4b5159' },
  heading: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 10, textAlign: 'center', marginTop: 4, color: '#4b5159' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    marginTop: 14,
    gap: 8,
  },
  totalLabel: { fontSize: 9, textTransform: 'uppercase', color: '#4b5159' },
  totalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 12, borderWidth: 1, borderColor: '#c9ccd1' },
  headerRow: { flexDirection: 'row', backgroundColor: INK },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e4e8' },
  rowAlt: { backgroundColor: '#f5f6f8' },
  headerCell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  cell: { paddingVertical: 4, paddingHorizontal: 5 },
  numeric: { textAlign: 'right' },
  empty: { marginTop: 16, textAlign: 'center', color: '#4b5159' },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7079',
  },
})

function ReportDocument({
  result,
  locale,
  strings,
}: {
  result: ReportResult
  locale: string
  strings: ReportPdfStrings
}) {
  const { columns, rows } = result

  return (
    <Document title={strings.heading} author={strings.brand}>
      {/* Landscape: the widest report carries seven columns, and the legacy
          portrait layout wrapped client names onto three lines. */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.brandRow} fixed>
          <Text style={styles.brand}>{strings.brand}</Text>
          <Text style={styles.generatedOn}>{strings.generatedOn}</Text>
        </View>

        <Text style={styles.heading}>{strings.heading}</Text>
        {strings.subtitle && <Text style={styles.subtitle}>{strings.subtitle}</Text>}

        {result.total && strings.totalLabel && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{strings.totalLabel}</Text>
            <Text style={styles.totalValue}>{formatQCents(result.total.value, locale)}</Text>
          </View>
        )}

        {rows.length === 0 ? (
          <Text style={styles.empty}>{strings.empty}</Text>
        ) : (
          <View style={styles.table}>
            {/* `fixed` repeats the heading on every page — a six-page round is
                unreadable otherwise, and mPDF was never told to do it. */}
            <View style={styles.headerRow} fixed>
              {columns.map((column, index) => (
                <Text
                  key={column.key}
                  style={[
                    styles.headerCell,
                    { width: `${column.width}%` },
                    ...(isNumericColumn(column) ? [styles.numeric] : []),
                  ]}
                >
                  {strings.columns[index]}
                </Text>
              ))}
            </View>

            {rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={[styles.row, ...(rowIndex % 2 === 1 ? [styles.rowAlt] : [])]}
                wrap={false}
              >
                {columns.map((column, index) => (
                  <Text
                    key={column.key}
                    style={[
                      styles.cell,
                      { width: `${column.width}%` },
                      ...(isNumericColumn(column) ? [styles.numeric] : []),
                    ]}
                  >
                    {formatReportCell(row[index], column.kind, locale)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => strings.page(pageNumber, totalPages)}
        />
      </Page>
    </Document>
  )
}

export function renderReportPdf(props: {
  result: ReportResult
  locale: string
  strings: ReportPdfStrings
}) {
  return renderToBuffer(<ReportDocument {...props} />)
}
