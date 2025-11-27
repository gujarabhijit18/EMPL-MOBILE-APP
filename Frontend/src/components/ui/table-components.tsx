import React from "react";
import { View, StyleSheet } from "react-native";

// Table Components
export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.table}>{children}</View>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.tableHeader}>{children}</View>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.tableBody}>{children}</View>
);

export const TableRow: React.FC<{ children: React.ReactNode; selected?: boolean }> = ({
  children,
  selected = false,
}) => (
  <View style={[styles.tableRow, selected && styles.selectedRow]}>
    {children}
  </View>
);

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.tableHead}>{children}</View>
);

export const TableCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.tableCell}>
    {children}
  </View>
);

export const TableCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.tableCaption}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  tableBody: {
    backgroundColor: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  selectedRow: {
    backgroundColor: '#f1f5f9',
  },
  tableHead: {
    flex: 1,
    padding: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tableCell: {
    flex: 1,
    padding: 12,
    color: '#334155',
  },
  tableCaption: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    textAlign: 'center',
    color: '#64748b',
  },
});
