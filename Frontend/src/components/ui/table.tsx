import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./table-components";

export default function TableExample() {
  return (
    <View style={styles.container}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <TableRow>
            <TableCell>1</TableCell>
            <TableCell>Abhijit</TableCell>
            <TableCell>Developer</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
          <TableRow selected>
            <TableCell>2</TableCell>
            <TableCell>Nilesh</TableCell>
            <TableCell>Designer</TableCell>
            <TableCell>Offline</TableCell>
          </TableRow>
        </TableBody>

        <TableCaption>2 employees in total</TableCaption>
      </Table>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
  },
});
