import React, { createContext, useContext } from "react";
import { View, Text, Dimensions, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
} from "react-native-chart-kit";

const { width } = Dimensions.get("window");

/* 🎨 Chart Theme Context */
export type ChartConfigType = {
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  color?: (opacity?: number) => string;
  labelColor?: (opacity?: number) => string;
  barPercentage?: number;
  useShadowColorFromDataset?: boolean;
};

export interface ChartContextType {
  theme: ChartConfigType;
  type?: "line" | "bar" | "pie" | "progress" | "contribution";
}

const ChartContext = createContext<ChartContextType | null>(null);

export const useChart = () => {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer />");
  return ctx;
};

/* 🧱 ChartContainer Component */
interface ChartContainerProps {
  type?: "line" | "bar" | "pie" | "progress" | "contribution";
  theme?: ChartConfigType;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  theme,
  type = "line",
  style,
}) => {
  const defaultTheme: ChartConfigType = {
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#F9FAFB",
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // blue-600
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`, // gray-700
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  return (
    <ChartContext.Provider value={{ theme: { ...defaultTheme, ...theme }, type }}>
      <View style={[styles.container, style]}>{children}</View>
    </ChartContext.Provider>
  );
};

/* 📊 Line Chart */
export const ChartLine: React.FC<{ data: any; width?: number; height?: number }> = ({
  data,
  width: w = width * 0.9,
  height = 220,
}) => {
  const { theme } = useChart();
  return (
    <LineChart
      data={data}
      width={w}
      height={height}
      chartConfig={theme}
      bezier
      fromZero
      style={styles.chart}
    />
  );
};

/* 📦 Bar Chart */
export const ChartBar: React.FC<{
  data: any;
  width?: number;
  height?: number;
  yAxisLabel?: string;
  yAxisSuffix?: string;
}> = ({
  data,
  width: w = width * 0.9,
  height = 220,
  yAxisLabel = "",
  yAxisSuffix = "",
}) => {
  const { theme } = useChart();
  return (
    <BarChart
      data={data}
      width={w}
      height={height}
      yAxisLabel={yAxisLabel}
      yAxisSuffix={yAxisSuffix}
      fromZero
      chartConfig={theme}
      style={styles.chart}
    />
  );
};

/* 🍩 Pie Chart */
export const ChartPie: React.FC<{ data: any[]; width?: number; height?: number }> = ({
  data,
  width: w = width * 0.9,
  height = 200,
}) => {
  const { theme } = useChart();
  return (
    <PieChart
      data={data}
      width={w}
      height={height}
      accessor="population"
      backgroundColor="transparent"
      chartConfig={theme}
      paddingLeft="15"
      center={[5, 5]}
      style={styles.chart}
    />
  );
};

/* 🟢 Progress Chart */
export const ChartProgress: React.FC<{ data: { labels: string[]; data: number[] }; width?: number; height?: number }> = ({
  data,
  width: w = width * 0.9,
  height = 200,
}) => {
  const { theme } = useChart();
  return (
    <ProgressChart
      data={data}
      width={w}
      height={height}
      strokeWidth={14}
      radius={40}
      chartConfig={theme}
      style={styles.chart}
    />
  );
};

/* 📅 Contribution Graph */
export const ChartContribution: React.FC<{ data: { date: string; count: number }[]; width?: number; height?: number }> = ({
  data,
  width: w = width * 0.9,
  height = 220,
}) => {
  const { theme } = useChart();
  return (
    <ContributionGraph
      values={data}
      endDate={new Date()}
      numDays={90}
      width={w}
      height={height}
      chartConfig={theme}
      tooltipDataAttrs={() => ({})}
      style={styles.chart}
    />
  );
};

/* 🧾 Tooltip */
export const ChartTooltip: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.tooltip}>
    <Text style={styles.tooltipLabel}>{label}</Text>
    <Text style={styles.tooltipValue}>{value}</Text>
  </View>
);

/* 🧩 Legend */
export const ChartLegend: React.FC<{ labels: string[] }> = ({ labels }) => (
  <View style={styles.legend}>
    {labels.map((label, i) => (
      <View key={i} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: getColor(i) }]} />
        <Text style={styles.legendText}>{label}</Text>
      </View>
    ))}
  </View>
);

/* 🎨 Helper: color palette */
function getColor(index: number) {
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
  return colors[index % colors.length];
}

/* 💅 Styles */
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  chart: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  tooltip: {
    padding: 8,
    backgroundColor: "#1F2937",
    borderRadius: 6,
  },
  tooltipLabel: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  tooltipValue: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: "#374151",
    fontSize: 13,
  },
});

export default ChartContainer;
