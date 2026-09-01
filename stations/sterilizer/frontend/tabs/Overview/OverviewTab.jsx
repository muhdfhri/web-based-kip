import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import "./OverviewTab.css";

import SterilizerStationSettingsPage from "../../settings/SterilizerStationSettingsPage.jsx";

// ==========================================
// 1. AUTH HELPERS & CONSTANTS
// ==========================================
const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Assets
import sterilizerStationImageUrl from "../../assets/sterilizer-station.webp";
import sterilizerLineImageUrl from "../../assets/sterilizer-line.webp";
import bpvImageUrl from "../../assets/bpv.webp";
import valveActuatorSvg from "../../assets/item/valve_actuator.svg";
import valvePositionerSvg from "../../assets/item/valve_positioner.svg";
// import topOpenSvg from "../../assets/item/top-open.svg";
// import topCloseSvg from "../../assets/item/top-close.svg";
// import botOpenSvg from "../../assets/item/bot-open.svg";
// import botCloseSvg from "../../assets/item/bot-close.svg";

import {
  IpomasMonitorCardSVG,
  EquipmentIconSVG,
  TagMonitorCardSVG,
  SterilizerStatusPanelSVG,
} from "../../components/SharedComponents.jsx";
import { WTFlowOverlay } from "../../components/WTFlowBuilder.jsx";

export const TEST_INLET_DOOR_ST1 = "CLOSE";
export const TEST_INLET_DOOR_ST2 = "CLOSE";
export const TEST_INLET_DOOR_ST3 = "CLOSE";
export const TEST_INLET_DOOR_ST4 = "CLOSE";

export const TEST_OUTLET_DOOR_ST1 = "OPEN";
export const TEST_OUTLET_DOOR_ST2 = "CLOSE";
export const TEST_OUTLET_DOOR_ST3 = "CLOSE";
export const TEST_OUTLET_DOOR_ST4 = "CLOSE";

// 24 Manual Actuators Configuration
const MANUAL_VALVES = [
  { id: "valve_exhaust_steam_st1", x: -246, y: 46, size: 85, rotation: 270 },
  { id: "valve_inlet_steam_1_st1", x: -266, y: 269, size: 92, rotation: 270 },
  { id: "valve_inlet_steam_2_st1", x: -266, y: 485, size: 92, rotation: 270 },
  { id: "valve_flashing_st1", x: -266, y: 673, size: 92, rotation: 270 },
  { id: "valve_condensate_1_st1", x: 228, y: 912, size: 85, rotation: 270 },
  { id: "valve_condensate_2_st1", x: 228, y: 1003, size: 85, rotation: 270 },
  { id: "valve_d_cond_st1", x: 158, y: 800, size: 85, rotation: 0 },

  { id: "valve_exhaust_steam_st2", x: 394, y: 46, size: 85, rotation: 270 },
  { id: "valve_inlet_steam_1_st2", x: 375, y: 269, size: 92, rotation: 270 },
  { id: "valve_inlet_steam_2_st2", x: 375, y: 485, size: 92, rotation: 270 },
  { id: "valve_flashing_st2", x: 375, y: 673, size: 92, rotation: 270 },
  { id: "valve_condensate_1_st2", x: 868, y: 912, size: 85, rotation: 270 },
  { id: "valve_condensate_2_st2", x: 868, y: 1003, size: 85, rotation: 270 },
  { id: "valve_d_cond_st2", x: 797, y: 800, size: 85, rotation: 0 },

  { id: "valve_exhaust_steam_st3", x: 1076, y: 46, size: 85, rotation: 270 },
  { id: "valve_inlet_steam_1_st3", x: 1057, y: 269, size: 92, rotation: 270 },
  { id: "valve_inlet_steam_2_st3", x: 1057, y: 485, size: 92, rotation: 270 },
  { id: "valve_flashing_st3", x: 1057, y: 673, size: 92, rotation: 270 },
  { id: "valve_condensate_1_st3", x: 1550, y: 912, size: 85, rotation: 270 },
  { id: "valve_condensate_2_st3", x: 1550, y: 1003, size: 85, rotation: 270 },
  { id: "valve_d_cond_st3", x: 1480, y: 800, size: 85, rotation: 0 },

  { id: "valve_exhaust_steam_st4", x: 1745, y: 46, size: 85, rotation: 270 },
  { id: "valve_inlet_steam_1_st4", x: 1725, y: 269, size: 92, rotation: 270 },
  { id: "valve_inlet_steam_2_st4", x: 1725, y: 485, size: 92, rotation: 270 },
  { id: "valve_flashing_st4", x: 1725, y: 673, size: 92, rotation: 270 },
  { id: "valve_condensate_1_st4", x: 2218, y: 912, size: 85, rotation: 270 },
  { id: "valve_condensate_2_st4", x: 2218, y: 1003, size: 85, rotation: 270 },
  { id: "valve_d_cond_st4", x: 2147, y: 800, size: 80, rotation: 0 },
];

const TOP_DOORS = [];
/*
const TOP_DOORS = [
  { id: "top_open_1", src: topOpenSvg, x: -135, y: -17, size: 173, rotation: 0 },
  { id: "top_open_2", src: topOpenSvg, x: 510, y: -17, size: 173, rotation: 0 },
  { id: "top_open_3", src: topOpenSvg, x: 1193, y: -17, size: 173, rotation: 0 },
  { id: "top_open_4", src: topOpenSvg, x: 1860, y: -17, size: 173, rotation: 0 },

  { id: "top_close_1", src: topCloseSvg, x: -112, y: 15, size: 150, rotation: 0 },
  { id: "top_close_2", src: topCloseSvg, x: 528, y: 15, size: 150, rotation: 0 },
  { id: "top_close_3", src: topCloseSvg, x: 1210, y: 15, size: 150, rotation: 0 },
  { id: "top_close_4", src: topCloseSvg, x: 1880, y: 15, size: 150, rotation: 0 },
];
*/

const BOT_DOORS = [];
/*
const BOT_DOORS = [
  { id: "bot_open_1", src: botOpenSvg, x: 122, y: 580, size: 190, rotation: 0 },
  { id: "bot_open_2", src: botOpenSvg, x: 768, y: 589, size: 190, rotation: 0 },
  { id: "bot_open_3", src: botOpenSvg, x: 1444, y: 582, size: 190, rotation: 0 },
  { id: "bot_open_4", src: botOpenSvg, x: 2115, y: 589, size: 190, rotation: 0 },

  { id: "bot_close_1", src: botCloseSvg, x: 127, y: 609, size: 150, rotation: 0 },
  { id: "bot_close_2", src: botCloseSvg, x: 767, y: 609, size: 150, rotation: 0 },
  { id: "bot_close_3", src: botCloseSvg, x: 1447, y: 609, size: 150, rotation: 0 },
  { id: "bot_close_4", src: botCloseSvg, x: 2115, y: 609, size: 150, rotation: 0 },
];
*/

// Overview Tag Monitor Cards (Grouped by Station)
const TAG_MONITOR_CARDS = [
  // --- COMMON / GLOBAL CARDS ---
  { id: "bpv_pressure", x: -430, y: 70, title: "BPV PRESSURE", defaultVal: "no tag", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "boiler_pressure", x: -430, y: 140, title: "BOILER PRESSURE", defaultVal: "no tag", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },

  // --- STERILIZER 1 (ST1) ---
  { id: "card_exhaust_steam_st1", x: 190, y: 170, title: "EXHAUST STEAM ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_1_st1", x: -185, y: 50, title: "INLET STEAM 1 ST1", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st1", x: -240, y: 210, title: "INLET STEAM 2 ST1", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st1", x: -240, y: 430, title: "INLET STEAM 3 ST1", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st1", x: -240, y: 550, title: "INLET STEAM 4 ST1", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st1", x: -400, y: 690, title: "FLASHING ST1", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st1", x: -20, y: 235, title: "INLET DOOR ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st1", x: -80, y: 780, title: "OUTLET DOOR ST1", defaultVal: TEST_OUTLET_DOOR_ST1, unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_1", x: -20, y: 340, title: "PRESSURE 1", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_1", x: -20, y: 700, title: "TEMPERATURE 1", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st1", x: -440, y: 975, title: "D. COND ST1", defaultVal: "OPEN", unit: "", status: "grey", width: 150, scale: 1 },
  { id: "card_relief_condensate_st1", x: -440, y: 1055, title: "RELIEF CONDENSATE VALVE ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st1", x: -440, y: 1120, title: "CONDENSATE ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  // --- STERILIZER 2 (ST2) ---
  { id: "card_exhaust_steam_st2", x: 850, y: 170, title: "EXHAUST STEAM ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_1_st2", x: 500, y: 50, title: "INLET STEAM 1 ST2", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st2", x: 420, y: 210, title: "INLET STEAM 2 ST2", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st2", x: 420, y: 430, title: "INLET STEAM 3 ST2", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st2", x: 420, y: 550, title: "INLET STEAM 4 ST2", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st2", x: 260, y: 690, title: "FLASHING ST2", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st2", x: 645, y: 235, title: "INLET DOOR ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st2", x: 582, y: 780, title: "OUTLET DOOR ST2", defaultVal: TEST_OUTLET_DOOR_ST2, unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_2", x: 645, y: 340, title: "PRESSURE 2", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_2", x: 645, y: 700, title: "TEMPERATURE 2", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st2", x: 220, y: 975, title: "D. COND ST2", defaultVal: "CLOSE", unit: "", status: "grey", width: 150, scale: 1 },
  { id: "card_relief_condensate_st2", x: 220, y: 1050, title: "RELIEF CONDENSATE VALVE ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st2", x: 220, y: 1120, title: "CONDENSATE ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  // --- STERILIZER 3 (ST3) ---
  { id: "card_exhaust_steam_st3", x: 1515, y: 170, title: "EXHAUST STEAM ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_1_st3", x: 1170, y: 50, title: "INLET STEAM 1 ST3", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st3", x: 1085, y: 210, title: "INLET STEAM 2 ST3", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st3", x: 1085, y: 430, title: "INLET STEAM 3 ST3", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st3", x: 1085, y: 550, title: "INLET STEAM 4 ST3", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st3", x: 925, y: 690, title: "FLASHING ST3", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st3", x: 1310, y: 235, title: "INLET DOOR ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st3", x: 1245, y: 780, title: "OUTLET DOOR ST3", defaultVal: TEST_OUTLET_DOOR_ST3, unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_3", x: 1310, y: 340, title: "PRESSURE 3", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_3", x: 1310, y: 700, title: "TEMPERATURE 3", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st3", x: 885, y: 975, title: "D. COND ST3", defaultVal: "OPEN", unit: "", status: "grey", width: 150, scale: 1 },
  { id: "card_relief_condensate_st3", x: 885, y: 1050, title: "RELIEF CONDENSATE VALVE ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st3", x: 885, y: 1120, title: "CONDENSATE ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  // --- STERILIZER 4 (ST4) ---
  { id: "card_exhaust_steam_st4", x: 2175, y: 170, title: "EXHAUST STEAM ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_1_st4", x: 1830, y: 50, title: "INLET STEAM 1 ST4", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st4", x: 1745, y: 210, title: "INLET STEAM 2 ST4", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st4", x: 1745, y: 430, title: "INLET STEAM 3 ST4", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st4", x: 1745, y: 550, title: "INLET STEAM 4 ST4", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st4", x: 1585, y: 690, title: "FLASHING ST4", defaultVal: "no tag", unit: "", status: "grey", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st4", x: 1970, y: 235, title: "INLET DOOR ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st4", x: 1905, y: 780, title: "OUTLET DOOR ST4", defaultVal: TEST_OUTLET_DOOR_ST4, unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_4", x: 1970, y: 340, title: "PRESSURE 4", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_4", x: 1965, y: 700, title: "TEMPERATURE 4", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st4", x: 1545, y: 975, title: "D. COND ST4", defaultVal: "OPEN", unit: "", status: "grey", width: 150, scale: 1 },
  { id: "card_relief_condensate_st4", x: 1545, y: 1050, title: "RELIEF CONDENSATE VALVE ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st4", x: 1545, y: 1120, title: "CONDENSATE ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
];

// Overview Equipment Icons (Grouped by Station)
const OVERVIEW_EQUIPMENT_ICONS = [
  // --- STERILIZER 1 (ST1) ICONS ---
  { id: "overview_inlet_steam_1_st1_icon", cardId: "card_inlet_steam_1_st1", x: -298, y: 40, icon: valvePositionerSvg, size: 90, rotation: 0 },
  { id: "overview_inlet_steam_2_st1_icon", cardId: "card_inlet_steam_2_st1", x: -245, y: 130, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_3_st1_icon", cardId: "card_inlet_steam_3_st1", x: -245, y: 350, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_4_st1_icon", cardId: "card_inlet_steam_4_st1", x: -245, y: 612, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_flashing_st1_icon", cardId: "card_flashing_st1", x: -270, y: 695, icon: valvePositionerSvg, size: 60, rotation: 270 },
  { id: "overview_d_cond_st1_icon", cardId: "d_cond_st1", x: -310, y: 947, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_relief_condensate_st1_icon", cardId: "card_relief_condensate_st1", x: -310, y: 1026, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_condensate_1_st1_icon", cardId: "card_condensate_1_st1", x: -310, y: 1106, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_exhaust_steam_st1_icon", cardId: "card_exhaust_steam_st1", x: 180, y: 88, icon: valvePositionerSvg, size: 90, rotation: 270 },

  // --- STERILIZER 2 (ST2) ICONS ---
  { id: "overview_inlet_steam_1_st2_icon", cardId: "card_inlet_steam_1_st2", x: 363, y: 40, icon: valvePositionerSvg, size: 90, rotation: 0 },
  { id: "overview_inlet_steam_2_st2_icon", cardId: "card_inlet_steam_2_st2", x: 415, y: 128, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_3_st2_icon", cardId: "card_inlet_steam_3_st2", x: 415, y: 349, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_4_st2_icon", cardId: "card_inlet_steam_4_st2", x: 415, y: 610, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_flashing_st2_icon", cardId: "card_flashing_st2", x: 390, y: 695, icon: valvePositionerSvg, size: 60, rotation: 270 },
  { id: "overview_d_cond_st2_icon", cardId: "d_cond_st2", x: 350, y: 945, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_relief_condensate_st2_icon", cardId: "card_relief_condensate_st2", x: 350, y: 1024, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_condensate_1_st2_icon", cardId: "card_condensate_1_st2", x: 350, y: 1105, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_exhaust_steam_st2_icon", cardId: "card_exhaust_steam_st2", x: 840, y: 86, icon: valvePositionerSvg, size: 90, rotation: 270 },

  // --- STERILIZER 3 (ST3) ICONS ---
  { id: "overview_inlet_steam_1_st3_icon", cardId: "card_inlet_steam_1_st3", x: 1027, y: 40, icon: valvePositionerSvg, size: 90, rotation: 0 },
  { id: "overview_inlet_steam_2_st3_icon", cardId: "card_inlet_steam_2_st3", x: 1080, y: 128, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_3_st3_icon", cardId: "card_inlet_steam_3_st3", x: 1080, y: 349, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_4_st3_icon", cardId: "card_inlet_steam_4_st3", x: 1080, y: 610, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_flashing_st3_icon", cardId: "card_flashing_st3", x: 1055, y: 695, icon: valvePositionerSvg, size: 60, rotation: 270 },
  { id: "overview_d_cond_st3_icon", cardId: "d_cond_st3", x: 1015, y: 945, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_relief_condensate_st3_icon", cardId: "card_relief_condensate_st3", x: 1015, y: 1024, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_condensate_1_st3_icon", cardId: "card_condensate_1_st3", x: 1015, y: 1104, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_exhaust_steam_st3_icon", cardId: "card_exhaust_steam_st3", x: 1505, y: 86, icon: valvePositionerSvg, size: 90, rotation: 270 },

  // --- STERILIZER 4 (ST4) ICONS ---
  { id: "overview_inlet_steam_1_st4_icon", cardId: "card_inlet_steam_1_st4", x: 1689, y: 40, icon: valvePositionerSvg, size: 90, rotation: 0 },
  { id: "overview_inlet_steam_2_st4_icon", cardId: "card_inlet_steam_2_st4", x: 1740, y: 127, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_3_st4_icon", cardId: "card_inlet_steam_3_st4", x: 1740, y: 348, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_4_st4_icon", cardId: "card_inlet_steam_4_st4", x: 1740, y: 608, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_flashing_st4_icon", cardId: "card_flashing_st4", x: 1715, y: 693, icon: valvePositionerSvg, size: 60, rotation: 270 },
  { id: "overview_d_cond_st4_icon", cardId: "d_cond_st4", x: 1675, y: 944, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_relief_condensate_st4_icon", cardId: "card_relief_condensate_st4", x: 1675, y: 1023, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_condensate_1_st4_icon", cardId: "card_condensate_1_st4", x: 1675, y: 1104, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_exhaust_steam_st4_icon", cardId: "card_exhaust_steam_st4", x: 2165, y: 84, icon: valvePositionerSvg, size: 90, rotation: 270 },
];


// ==========================================
// 2. FORMATTERS & VALUE PARSERS
// ==========================================
const formatDoorStatus = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return "--";
  if (rawVal === "No Tag" || String(rawVal).trim().toLowerCase() === "no tag") return "No Tag";
  if (rawVal === "--") return "--";
  if (typeof rawVal === "boolean") {
    return rawVal ? "CLOSE" : "OPEN";
  }
  const str = String(rawVal).toLowerCase().trim();
  if (str === "no tag") return "No Tag";
  if (str === "--") return "--";
  if (str === "true" || str === "1") return "CLOSE";
  if (str === "false" || str === "0") return "OPEN";
  if (str === "open" || str === "close") return str.toUpperCase();
  return "CLOSE";
};

const formatValveStatus = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return "--";
  if (rawVal === "No Tag" || String(rawVal).trim().toLowerCase() === "no tag") return "No Tag";
  if (rawVal === "--") return "--";
  if (typeof rawVal === "boolean") {
    return rawVal ? "OPEN" : "CLOSE";
  }
  const str = String(rawVal).toLowerCase().trim();
  if (str === "no tag") return "No Tag";
  if (str === "--") return "--";
  if (str === "true" || str === "1" || str === "open") return "OPEN";
  if (str === "false" || str === "0" || str === "close") return "CLOSE";
  const num = parseFloat(rawVal);
  if (!isNaN(num)) {
    return num > 0 ? "OPEN" : "CLOSE";
  }
  return "CLOSE";
};

// ==========================================
// 3. HOOKS
// ==========================================
function useAmpHover() {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const [popupPos, setPopupPos] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.top,
        right: rect.right,
        left: rect.left,
        bottom: rect.bottom,
      });
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setPopupPos(null);
    }, 150);
  };

  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handlePopupMouseLeave = () => {
    setIsHovered(false);
    setPopupPos(null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  };
}

// ==========================================
// 4. GRAPH & POPUP COMPONENTS
// ==========================================
function StatusGraphPopup({
  position,
  equipmentName,
  type = "Pressure",
  value = 0,
  unit = "Bar",
  onMouseEnter,
  onMouseLeave,
}) {
  const popupRef = useRef(null);
  const [style, setStyle] = useState({ opacity: 0, pointerEvents: "none" });

  useEffect(() => {
    if (!position || !popupRef.current) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 450;
    const popupHeight = 400;
    const padding = 20;

    let left = position.right + 15;
    let top = position.top - 10;

    if (left + popupWidth > viewportWidth - padding) {
      left = position.left - popupWidth - 15;
    }
    if (top + popupHeight > viewportHeight - padding) {
      top = viewportHeight - popupHeight - padding;
    }
    if (top < padding) top = padding;
    if (left < padding) left = padding;

    setStyle({
      top: `${top}px`,
      left: `${left}px`,
      opacity: 1,
      pointerEvents: "auto",
    });
  }, [position]);

  const width = 400;
  const height = 200;
  const plotLeft = 40;
  const plotRight = 360;
  const plotTop = 20;
  const plotBottom = 160;

  const points = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const x = plotLeft + ((plotRight - plotLeft) * i) / 19;
      const yVal = Math.max(0, value);
      const maxRange = type === "Pressure" ? 5 : 200;
      const t = yVal / maxRange;
      const y = plotBottom - t * (plotBottom - plotTop);
      return { x, y };
    });
  }, [value, type]);

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return createPortal(
    <div
      ref={popupRef}
      className="som-amp-popup"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="som-amp-popup-header">
        <div className="som-amp-popup-title">{type} Trend</div>
        <div className="som-amp-popup-subtitle">
          <span>{equipmentName}</span>
          <span>
            Current: {value.toFixed(2)} {unit}
          </span>
        </div>
      </div>
      <div className="som-amp-popup-body">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="som-amp-graph-svg"
        >
          <defs>
            <linearGradient
              id="trendGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ffdb3b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffdb3b" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotRight - plotLeft}
            height={plotBottom - plotTop}
            fill="rgba(248, 250, 252, 0.5)"
            rx="4"
          />
          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={plotRight}
            y2={plotBottom}
            stroke="#e2e8f0"
          />
          <line
            x1={plotLeft}
            y1={plotTop}
            x2={plotLeft}
            y2={plotBottom}
            stroke="#e2e8f0"
          />
          <polygon
            className="som-amp-graph-area"
            points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`}
            style={{ fill: "url(#trendGradient)" }}
          />
          <polyline
            className="som-amp-graph-line-main"
            points={polyPoints}
            fill="none"
            stroke="#d4ac0d"
            strokeWidth="2"
          />
          {points.map((p, idx) => (
            <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#d4ac0d" />
          ))}
        </svg>
      </div>
    </div>,
    document.body
  );
}

// ==========================================
// 5. FLOW & ANIMATION COMPONENTS
// ==========================================
const SteamFlowSVG = ({ d, active, color = "#38bdf8", thickness = 8 }) => {
  if (!active) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness + 6,
          filter: "blur(4px)",
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness,
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
    </g>
  );
};

export const LiquidSteamFlowSVG = ({ d, active, mode = "flowing", color = "#38bdf8", thickness = 8 }) => {
  if (!active) return null;
  return (
    <g className={`liquid-flow--${mode}`} style={{ pointerEvents: "none" }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        className="liquid-flow-glow"
        style={{ strokeWidth: thickness + 6 }}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        className="liquid-flow-aura"
        style={{ strokeWidth: thickness }}
      />
    </g>
  );
};

export const LiquidFlowSVG = ({
  d,
  isRunning,
  color = "#f59e0b",
  thickness = 8,
}) => {
  if (!isRunning) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness + 6,
          filter: "blur(4px)",
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness,
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
    </g>
  );
};

export const CrosshairOverlay = ({ coords }) => {
  return (
    <g pointerEvents="none">
      <line x1={coords.x} y1="-5000" x2={coords.x} y2="5000" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <line x1="-5000" y1={coords.y} x2="5000" y2={coords.y} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <rect x={coords.x + 10} y={coords.y + 10} width="80" height="24" fill="rgba(0,0,0,0.7)" rx="4" />
      <text x={coords.x + 16} y={coords.y + 26} fill="#fff" fontSize="12px" fontWeight="bold">
        {coords.x}, {coords.y}
      </text>
    </g>
  );
};

// ==========================================
// 6. REUSABLE HARDWARE & SVG CARDS
// ==========================================
const ValveSVG = ({
  x,
  y,
  id,
  type = "actuator",
  status,
  opening,
  label,
  onClick,
  size = 50,
  labelYOffset,
  labelXOffset,
  labelWidth = 60,
  style,
}) => {
  const isNoTag = status.toUpperCase() === "NO TAG";
  const isOpen = !isNoTag && (status.toLowerCase() === "open" || (opening !== undefined && opening > 0));
  const statusClass = isNoTag ? "valve-off" : isOpen ? "valve-on" : "valve-off";
  const offset = size / 2;
  const ly = labelYOffset !== undefined ? labelYOffset : offset - 78;
  const lx = labelXOffset !== undefined ? labelXOffset : offset - 10;

  return (
    <g
      id={id}
      className={`svg-equipment valve-group ${statusClass}`}
      onClick={() => onClick(id)}
      style={style}
    >
      <foreignObject x={x + lx} y={y + ly} width={labelWidth} height="45">
        <div
          className="som-sterilizer-mini-card compact"
          style={{
            border: "none",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <span className="som-mini-label" style={{ textAlign: "center" }}>
            {label}
          </span>
          <span
            className={`som-mini-value ${isNoTag ? "" : isOpen ? "som-mini-value--open" : "som-mini-value--closed"}`}
            style={{
              textAlign: "center",
              color: isNoTag ? "#94a3b8" : undefined,
              fontStyle: isNoTag ? "italic" : "normal",
            }}
          >
            {status}
          </span>
        </div>
      </foreignObject>
    </g>
  );
};

const SensorCardSVG = ({
  x,
  y,
  id,
  label,
  value,
  unit,
  equipmentName,
  trendType,
  onClick,
  size = 90,
  style,
}) => {
  const {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  } = useAmpHover();

  const isNoTag = value === "No Tag";
  const isActive = !isNoTag && (parseFloat(value) > 0 || String(value).toLowerCase() === "ripe");

  return (
    <g
      id={id}
      className="svg-equipment sensor-group"
      onClick={() => onClick(id)}
      style={style}
    >
      <foreignObject
        x={x - 150}
        y={y - 35}
        width="300"
        height="70"
        style={{ overflow: "visible" }}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <div
            ref={cardRef}
            className="som-motor-mini-card"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: "pointer" }}
          >
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{equipmentName}</span>
              <div
                className={`som-status-indicator ${isNoTag ? "" : isActive ? "running" : "stop"}`}
                style={isNoTag ? { background: "#94a3b8", boxShadow: "none", animation: "none" } : {}}
              />
            </div>
            <div
              className="som-motor-mini-body"
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "baseline",
                gap: "5px",
              }}
            >
              {isNoTag ? (
                <span
                  className="som-motor-mini-value"
                  style={{
                    fontSize: "20px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  no tag
                </span>
              ) : (
                <>
                  <span className="som-motor-mini-value" style={{ fontSize: "20px" }}>
                    {value}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#94a3b8",
                    }}
                  >
                    {unit}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </foreignObject>
      {!isNoTag && isHovered && popupPos && (
        <StatusGraphPopup
          position={popupPos}
          equipmentName={equipmentName}
          type={trendType}
          value={parseFloat(value) || 0}
          unit={unit}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}
    </g>
  );
};

const DoorCardSVG = ({ x, y, id, label, status, onClick, size = 90, style }) => {
  const s = status.toLowerCase();
  const isNoTag = s === "no tag";
  const isOpen = !isNoTag && (s === "open" || s === "unlock");

  return (
    <g id={id} className="svg-equipment door-group" onClick={() => onClick(id)} style={style}>
      <foreignObject
        x={x - 150}
        y={y - 30}
        width="300"
        height="60"
        style={{ overflow: "visible" }}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <div className="som-motor-mini-card">
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div
                className={`som-status-indicator ${isNoTag ? "" : isOpen ? "running" : "stop"}`}
                style={isNoTag ? { background: "#94a3b8", boxShadow: "none", animation: "none" } : {}}
              />
            </div>
            <div
              className="som-motor-mini-body"
              style={{ justifyContent: "center", alignItems: "center" }}
            >
              <span
                className="som-motor-mini-value"
                style={{
                  color: isNoTag ? "#94a3b8" : isOpen ? "#10b981" : "#ef4444",
                  fontStyle: isNoTag ? "italic" : "normal",
                }}
              >
                {status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

const MaintenanceCardSVG = ({
  x,
  y,
  id,
  label,
  params = [],
  onClick,
  width = 300,
  style,
}) => (
  <g
    id={id}
    className="svg-equipment motor-group maintenance-card-group"
    onClick={() => onClick && onClick(id)}
    style={style}
  >
    <foreignObject
      x={x - width / 2}
      y={y - 40}
      width={width}
      height="120"
      style={{ overflow: "visible" }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div className="som-motor-mini-card maintenance-card">
          <div className="som-motor-mini-header">
            <div className="som-motor-mini-label">{label}</div>
            <div className="som-maintenance-mini-icon">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
          </div>
          <div className="som-motor-mini-body">
            {params.map((p, idx) => (
              <div key={idx} className="som-motor-param-row">
                <span className="som-motor-param-label">{p.label}</span>
                <span className="som-motor-mini-value" data-unit={p.unit}>
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </foreignObject>
  </g>
);

const StationLabelSVG = ({ x, y, label }) => (
  <text
    x={x}
    y={y}
    className="som-line-badge-svg"
    textAnchor="middle"
    dominantBaseline="middle"
    filter="url(#yellow-glow)"
    style={{
      pointerEvents: "none",
      fill: "#000000ff",
      fontWeight: "900",
      fontSize: "24px",
      textTransform: "uppercase",
      opacity: 100,
    }}
  >
    {label}
  </text>
);

const SummaryTableSVG = ({ x, y, id, title, data, onClick, style }) => (
  <foreignObject x={x} y={y} width="320" height="180">
    <div
      className="som-dig-card"
      id={id}
      onClick={() => onClick && onClick(id)}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <div className="som-dig-card-header" style={{ textAlign: "center" }}>
        {title}
      </div>
      <div className="som-dig-card-body">
        {data.map((row, i) => (
          <div key={i} className="som-dig-row">
            <span className="som-dig-label" style={{ fontSize: "11px" }}>
              {row.label}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span className="som-dig-value" style={{ fontSize: "15px" }}>
                {row.value}
              </span>
              <span className="som-dig-unit" style={{ fontSize: "11px" }}>
                {row.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </foreignObject>
);

const SettingsCardSVG = ({
  x,
  y,
  titleAuto,
  titleManual,
  dataAuto,
  dataManual,
  width = 580,
}) => (
  <foreignObject x={x} y={y} width={width} height="500">
    <div className="som-minimal-card">
      <div className="som-minimal-header">{titleAuto}</div>
      <div className="som-minimal-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {dataAuto.map((row, i) => (
            <div
              key={i}
              className="som-minimal-row"
              style={{ borderBottom: "none" }}
            >
              <span className="som-minimal-label">{row.label}</span>
              <div>
                <span
                  className="som-minimal-value"
                  style={{ color: "#d4ac0d" }}
                >
                  {row.value}
                </span>
                <span className="som-minimal-unit">{row.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="som-minimal-divider" />
        <div className="som-minimal-section-title">{titleManual}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {dataManual.map((row, i) => (
            <div
              key={i}
              className="som-minimal-row"
              style={{ borderBottom: "none" }}
            >
              <span className="som-minimal-label">{row.label}</span>
              <div>
                <span
                  className="som-minimal-value"
                  style={{ color: "#d4ac0d" }}
                >
                  {row.value}
                </span>
                <span className="som-minimal-unit">{row.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </foreignObject>
);

const StatusTableCardSVG = ({
  x,
  y,
  id,
  title,
  data,
  width = 450,
  onClick,
  style,
}) => (
  <foreignObject x={x} y={y} width={width} height="650">
    <div
      className="som-minimal-card"
      id={id}
      onClick={() => onClick && onClick(id)}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <div className="som-minimal-header">{title}</div>
      <div className="som-minimal-body">
        {data.map((row, i) => (
          <div key={i} className="som-minimal-row">
            <span className="som-minimal-label">{row.label}</span>
            <div>
              <span
                className="som-minimal-value"
                style={{ color: row.isHighlight ? "#d4ac0d" : "#0f172a" }}
              >
                {row.value}
              </span>
              {row.unit && <span className="som-minimal-unit">{row.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  </foreignObject>
);

const ValveModernCardSVG = ({
  x,
  y,
  scale = 1,
  title = "",
  command = "CLOSE",
  position = "0.0",
  onClick,
}) => {
  const isOpen = command === "OPEN";
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-100, -65)`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <foreignObject width="200" height="130" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "12px",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                COMMAND
              </span>
              <div
                style={{
                  padding: "2px 10px",
                  borderRadius: "4px",
                  background: isOpen ? "#f1fdf3" : "#fef2f2",
                  border: `1px solid ${isOpen ? "#1FE921" : "#EF4444"}`,
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: isOpen ? "#1FE921" : "#EF4444",
                    fontWeight: "900",
                  }}
                >
                  {command}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "5px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "2px",
                }}
              >
                POSITION
              </span>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "24px",
                  background: "#f1f5f9",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    width: `${position}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, #ffdb3b, #d4ac0d)`,
                    transition: "width 0.5s ease",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "950",
                    color: "#0f172a",
                  }}
                >
                  {position}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

const BpvModernStatusCardSVG = ({
  x,
  y,
  scale = 1,
  status = "EMERGENCY",
  makeup = "OPEN",
  surplus = "OPEN",
  pressure = "0.0",
  onClick,
}) => {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-160, -90)`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <foreignObject width="320" height="180" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "15px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "8px",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            BACK PRESSURE VESSEL
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                STATUS
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: status === "EMERGENCY" ? "#EF4444" : "#1FE921",
                  fontWeight: "950",
                }}
              >
                {status}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                MAKE-UP
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: makeup === "OPEN" ? "#1FE921" : "#64748b",
                  fontWeight: "950",
                }}
              >
                {makeup}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                SURPLUS
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: surplus === "OPEN" ? "#1FE921" : "#64748b",
                  fontWeight: "950",
                }}
              >
                {surplus}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                PRESSURE
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "22px",
                    color: "#d4ac0d",
                    fontWeight: "950",
                  }}
                >
                  {pressure}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: "bold",
                  }}
                >
                  BAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

const AtmosphereLabelSVG = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <path
      d="M -25,-18 L 25,-18 M 15,-25 L 25,-18 L 15,-11"
      stroke="rgba(255,255,255,0.8)"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text
      x="0"
      y="0"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        fill: "rgba(255,255,255,0.8)",
        fontWeight: "900",
        fontSize: "15px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      To Atmosfer
    </text>
  </g>
);

const BpvControlSwitchPanelSVG = ({
  x,
  y,
  scale = 1,
  mode = "MANUAL",
  makeup = "CLOSE",
  blowoff = "OPEN",
  onModeToggle,
  onMakeupToggle,
  onBlowoffToggle,
}) => {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-180, -75)`}
      className="bpv-modern-control-group"
    >
      <foreignObject width="360" height="150" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "10px",
              marginBottom: "15px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            CONTROL PANEL
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            {/* MODE SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                MODE
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onModeToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: mode === "AUTO" ? "#ffdb3b" : "transparent",
                    color: "#0f172a",
                  }}
                >
                  AUTO
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: mode === "MANUAL" ? "#fbbf24" : "transparent",
                    color: "#0f172a",
                  }}
                >
                  MAN
                </div>
              </div>
            </div>

            {/* MAKE-UP SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                MAKE-UP
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onMakeupToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: makeup === "OPEN" ? "#1FE921" : "transparent",
                    color: makeup === "OPEN" ? "#fff" : "#64748b",
                  }}
                >
                  OPEN
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: makeup === "CLOSE" ? "#EF4444" : "transparent",
                    color: makeup === "CLOSE" ? "#fff" : "#64748b",
                  }}
                >
                  CLOSE
                </div>
              </div>
            </div>

            {/* BLOW-OFF SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                BLOW-OFF
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onBlowoffToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: blowoff === "OPEN" ? "#1FE921" : "transparent",
                    color: blowoff === "OPEN" ? "#fff" : "#64748b",
                  }}
                >
                  OPEN
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: blowoff === "CLOSE" ? "#EF4444" : "transparent",
                    color: blowoff === "CLOSE" ? "#fff" : "#64748b",
                  }}
                >
                  CLOSE
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

// ==========================================
// 7. SETTING VALVE MODULATE SVG
//    (Card ini di-nonaktifkan sementara — hanya valve_positioner yang tampil)
// ==========================================
export function SettingValveModulateSVG({
  x,
  y,
  scale = 1,
  getMappedValue,
  line = 1,
  handleEquipmentClick,
  getDeveloperStyle,
  config,
}) {
  // NOTE: seluruh isi card ini di-comment, komponen tetap ada tapi tidak
  // merender apa pun (return null) selama mode "hanya valve_positioner" aktif.
  return null;
  /*
  const cardWidth = 980;
  const cardHeight = 510;

  const defaultConfig = {
    titleAuto: `SETTING VALVE MODULATE INLET AUTO (LINE ${line})`,
    titleManual: `SETTING VALVE MODULATE INLET MANUAL (LINE ${line})`,
    autoValves: [
      {
        id: `st${line}_v1_valve_auto`,
        title: "VALVE 1",
        rows: [
          { label: "MIN", signalKey: "MIN", unit: "%" },
          { label: "MAX", signalKey: "MAX", unit: "%" },
          { label: "SET POINT", signalKey: "SETPOINT", unit: "Bar" },
          { label: "CONTROL LOW", signalKey: "CONTROL_RANGE_LOW", unit: "Bar" },
        ],
      },
      {
        id: `st${line}_v2_valve_auto`,
        title: "VALVE 2",
        rows: [
          { label: "MIN", signalKey: "MIN", unit: "%" },
          { label: "MAX", signalKey: "MAX", unit: "%" },
          { label: "SET POINT", signalKey: "SETPOINT", unit: "Bar" },
          { label: "CONTROL LOW", signalKey: "CONTROL_RANGE_LOW", unit: "Bar" },
        ],
      },
      {
        id: `st${line}_v3_valve_auto`,
        title: "VALVE 3",
        rows: [
          { label: "MIN", signalKey: "MIN", unit: "%" },
          { label: "MAX", signalKey: "MAX", unit: "%" },
          { label: "SET POINT", signalKey: "SETPOINT", unit: "Bar" },
          { label: "CONTROL LOW", signalKey: "CONTROL_RANGE_LOW", unit: "Bar" },
        ],
      },
    ],
    manualValves: [
      { id: `st${line}_mv1_valve_manual`, title: "VALVE 1", label: "SET VALUE", signalKey: "SET_VALUE", unit: "%" },
      { id: `st${line}_mv2_valve_manual`, title: "VALVE 2", label: "SET VALUE", signalKey: "SET_VALUE", unit: "%" },
      { id: `st${line}_mv3_valve_manual`, title: "VALVE 3", label: "SET VALUE", signalKey: "SET_VALUE", unit: "%" },
    ],
    highTemp: {
      id: `st${line}_high_temp`,
      title: "HIGH TEMP",
      label: "HIGH TEMP",
      signalKey: "SETPOINT",
      unit: "°C",
    },
  };

  const finalConfig = config || defaultConfig;

  const fetchVal = (cardId, signalKey) => {
    if (!getMappedValue || !cardId || !signalKey) return "No Tag";
    const mapped = getMappedValue(cardId, signalKey, "No Tag");
    if (mapped === "No Tag" || String(mapped).trim().toLowerCase() === "no tag") return "No Tag";
    if (mapped === "--" || mapped === undefined || mapped === null) return "--";
    return mapped;
  };

  const DataRow = ({ label, value, unit }) => {
    const isNoTag = !value || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
    let valueClass = "";
    const cleanLabel = String(label).toUpperCase().trim();
    if (!isNoTag) {
      if (cleanLabel.includes("SET POINT") || cleanLabel.includes("SET VALUE")) {
        valueClass = "som-premium-value-sp";
      } else if (cleanLabel.includes("MIN") || cleanLabel.includes("MAX")) {
        valueClass = "som-premium-value-minmax";
      } else if (cleanLabel.includes("CONTROL LOW")) {
        valueClass = "som-premium-value-cl";
      }
    }

    return (
      <div className="som-premium-row">
        <span className="som-premium-row-label">{label}</span>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span
            className={valueClass}
            style={{
              fontStyle: "italic",
              color: isNoTag ? "#94a3b8" : undefined,
            }}
          >
            {value}
          </span>
          <span className="som-premium-row-unit">{!isNoTag ? unit : ""}</span>
        </div>
      </div>
    );
  };

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <foreignObject
        x={0}
        y={0}
        width={cardWidth}
        height={cardHeight}
        style={{ overflow: "visible" }}
      >
        <div
          className="som-premium-modulate-card"
          style={{
            margin: "8px 12px 32px 12px",
            width: "calc(100% - 24px)",
            height: "calc(100% - 40px)",
            boxSizing: "border-box",
          }}
        >
          <div className="som-premium-modulate-header">
            <span>{finalConfig.titleAuto}</span>
            <div className="som-status-indicator running" style={{ position: "absolute", right: "16px" }} />
          </div>

          <div
            className="som-minimal-body"
            style={{
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              flex: 1,
              boxSizing: "border-box",
              background: "transparent",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                {finalConfig.autoValves.map((vConfig, i) => {
                  const cardId = vConfig.id || `st${line}_v${i + 1}_valve_auto`;
                  const cardStyle = getDeveloperStyle ? getDeveloperStyle(cardId) : {};
                  return (
                    <div
                      key={i}
                      className="som-premium-subcard"
                      style={{ flex: 1, cursor: "pointer", ...cardStyle }}
                      onClick={() => handleEquipmentClick && handleEquipmentClick(cardId)}
                    >
                      <div className="som-premium-subcard-header">{vConfig.title}</div>
                      <div style={{ padding: "8px 0" }}>
                        {vConfig.rows.map((r, rIdx) => (
                          <DataRow
                            key={rIdx}
                            label={r.label}
                            value={r.tag ? fetchVal(r.tag, "MONITOR") : fetchVal(cardId, r.signalKey)}
                            unit={r.unit}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="som-minimal-divider" style={{ margin: "6px 0", background: "rgba(255,255,255,0.08)" }} />

            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  textAlign: "center",
                  marginBottom: "8px",
                  letterSpacing: "0.1em",
                }}
              >
                {finalConfig.titleManual}
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 3, display: "flex", gap: "16px" }}>
                  {finalConfig.manualValves.map((vConfig, i) => {
                    const cardId = vConfig.id || `st${line}_mv${i + 1}_valve_manual`;
                    const cardStyle = getDeveloperStyle ? getDeveloperStyle(cardId) : {};
                    return (
                      <div
                        key={i}
                        className="som-premium-subcard"
                        style={{ flex: 1, cursor: "pointer", ...cardStyle }}
                        onClick={() => handleEquipmentClick && handleEquipmentClick(cardId)}
                      >
                        <div className="som-premium-subcard-header">{vConfig.title}</div>
                        <div style={{ padding: "8px 0" }}>
                          <DataRow
                            key={i}
                            label={vConfig.label}
                            value={vConfig.tag ? fetchVal(vConfig.tag, "MONITOR") : fetchVal(cardId, vConfig.signalKey || "SET_VALUE")}
                            unit={vConfig.unit}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const htConfig = finalConfig.highTemp || {};
                  const cardId = htConfig.id || `st${line}_high_temp`;
                  const cardStyle = getDeveloperStyle ? getDeveloperStyle(cardId) : {};
                  const htVal = htConfig.tag ? fetchVal(htConfig.tag, "MONITOR") : fetchVal(cardId, htConfig.signalKey || "SETPOINT");
                  const isNoTag = !htVal || String(htVal).trim().toLowerCase() === "no tag" || String(htVal).trim() === "--";

                  return (
                    <div
                      className="som-premium-subcard-warning"
                      style={{ flex: 1, cursor: "pointer", ...cardStyle }}
                      onClick={() => handleEquipmentClick && handleEquipmentClick(cardId)}
                    >
                      <div className="som-premium-subcard-warning-header">{htConfig.title}</div>
                      <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50px" }}>
                        <div style={{ display: "flex", alignItems: "baseline" }}>
                          <span
                            className={isNoTag ? "" : "som-premium-warning-value"}
                            style={{
                              fontStyle: "italic",
                              color: isNoTag ? "#94a3b8" : undefined,
                              fontSize: isNoTag ? "20px" : undefined,
                              fontWeight: 900,
                            }}
                          >
                            {htVal}
                          </span>
                          {!isNoTag && (
                            <span className="som-premium-warning-unit">
                              {htConfig.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
  */
}

// ==========================================
// 8. LINE EQUIPMENT COMPONENT (MODULARIZED)
// ==========================================
function LineEquipmentBlocks({
  line,
  getMappedValue,
  handleEquipmentClick,
  getDeveloperStyle,
}) {
  const n = line;

  // Exhaust Steam Status
  const rawExhaustVal = getMappedValue ? getMappedValue(`card_exhaust_steam_st${n}`, "MONITOR", "0") : "0";
  const exhaustTagVal = String(rawExhaustVal);
  const exhaustNumVal = parseFloat(exhaustTagVal);
  const isExhaustOpen = !isNaN(exhaustNumVal) ? exhaustNumVal > 0 : (exhaustTagVal === "OPEN" || exhaustTagVal === "true" || exhaustTagVal === "1");

  // Inlet Steam 1 Status
  const rawInlet1Val = getMappedValue ? getMappedValue(`card_inlet_steam_1_st${n}`, "MONITOR", "0") : "0";
  const inlet1TagVal = String(rawInlet1Val);
  const inlet1NumVal = parseFloat(inlet1TagVal);
  const isInlet1Open = !isNaN(inlet1NumVal) && inlet1NumVal > 0;

  // Inlet Steam 2 Status
  const rawInlet2Val = getMappedValue ? getMappedValue(`card_inlet_steam_2_st${n}`, "MONITOR", "0") : "0";
  const inlet2TagVal = String(rawInlet2Val);
  const inlet2NumVal = parseFloat(inlet2TagVal);
  const isInlet2Open = !isNaN(inlet2NumVal) ? inlet2NumVal > 0 : (inlet2TagVal === "OPEN" || inlet2TagVal === "true" || inlet2TagVal === "1");

  // Flashing Status
  const rawFlashingVal = getMappedValue ? getMappedValue(`card_flashing_st${n}`, "MONITOR", "0") : "0";
  const flashingTagVal = String(rawFlashingVal);
  const flashingNumVal = parseFloat(flashingTagVal);
  const isFlashingOpen = !isNaN(flashingNumVal) ? flashingNumVal > 0 : (flashingTagVal === "OPEN" || flashingTagVal === "true" || flashingTagVal === "1");

  // D.Condensate Status
  const rawDCondVal = getMappedValue ? getMappedValue(`d_cond_st${n}`, "MONITOR", "0") : "0";
  const dCondTagVal = String(rawDCondVal);
  const dCondNumVal = parseFloat(dCondTagVal);
  const isDCondOpen = !isNaN(dCondNumVal) ? dCondNumVal > 0 : (dCondTagVal === "OPEN" || dCondTagVal === "true" || dCondTagVal === "1");

  // Condensate 1 Status
  const rawCond1Val = getMappedValue ? getMappedValue(`card_condensate_1_st${n}`, "MONITOR", "0") : "0";
  const cond1TagVal = String(rawCond1Val);
  const cond1NumVal = parseFloat(cond1TagVal);
  const isCond1Open = !isNaN(cond1NumVal) ? cond1NumVal > 0 : (cond1TagVal === "OPEN" || cond1TagVal === "true" || cond1TagVal === "1");

  // Condensate 2 Status
  const rawCond2Val = getMappedValue ? getMappedValue(`card_condensate_2_st${n}`, "MONITOR", "0") : "0";
  const cond2TagVal = String(rawCond2Val);
  const cond2NumVal = parseFloat(cond2TagVal);
  const isCond2Open = !isNaN(cond2NumVal) ? cond2NumVal > 0 : (cond2TagVal === "OPEN" || cond2TagVal === "true" || cond2TagVal === "1");

  return (
    <g id={`line${n}_equipment_blocks`}>
      {/* EXHAUST STEAM */}
      <g id={`block_exhaust_steam_st${n}`}>
        <EquipmentIconSVG
          key={`valve_exhaust_steam_st${n}`}
          x={145}
          y={50}
          icon={valveActuatorSvg}
          size={90}
          rotation={270}
          isRunning={isExhaustOpen}
        />
        <TagMonitorCardSVG
          x={40}
          y={20}
          title={`EXHAUST STEAM ST${n}`}
          value={exhaustTagVal}
          unit=""
          status={isExhaustOpen ? "green" : "red"}
          width={150}
          onClick={() => handleEquipmentClick && handleEquipmentClick(`card_exhaust_steam_st${n}`)}
          style={getDeveloperStyle(`card_exhaust_steam_st${n}`)}
        />
      </g>

      {/* INLET STEAM 1 */}
      <g id={`block_inlet_steam_1_st${n}`}>
        <EquipmentIconSVG
          key={`valve_inlet_steam_1_st${n}`}
          x={125}
          y={275}
          icon={valvePositionerSvg}
          size={100}
          rotation={270}
          isRunning={isInlet1Open}
        />
        <TagMonitorCardSVG
          x={140}
          y={200}
          title={`INLET STEAM 1 ST${n}`}
          value={inlet1TagVal}
          unit=""
          status={isInlet1Open ? "green" : "red"}
          width={150}
          onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_1_st${n}`)}
          style={getDeveloperStyle(`card_inlet_steam_1_st${n}`)}
        />
      </g>

      {/* INLET STEAM 2 */}
      <g id={`block_inlet_steam_2_st${n}`}>
        <EquipmentIconSVG
          key={`valve_inlet_steam_2_st${n}`}
          x={125}
          y={488}
          icon={valvePositionerSvg}
          size={100}
          rotation={270}
          isRunning={isInlet2Open}
        />
        <TagMonitorCardSVG
          x={140}
          y={415}
          title={`INLET STEAM 2 ST${n}`}
          value={inlet2TagVal}
          unit=""
          status={isInlet2Open ? "green" : "red"}
          width={150}
          onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_2_st${n}`)}
          style={getDeveloperStyle(`card_inlet_steam_2_st${n}`)}
        />
      </g>

      {/* FLASHING */}
      <g id={`block_flashing_st${n}`}>
        <EquipmentIconSVG
          key={`valve_flashing_st${n}`}
          x={125}
          y={675}
          icon={valveActuatorSvg}
          size={100}
          rotation={270}
          isRunning={isFlashingOpen}
        />
        <TagMonitorCardSVG
          x={140}
          y={610}
          title={`FLASHING ST${n}`}
          value={flashingTagVal}
          unit=""
          status={isFlashingOpen ? "green" : "red"}
          width={150}
          onClick={() => handleEquipmentClick && handleEquipmentClick(`card_flashing_st${n}`)}
          style={getDeveloperStyle(`card_flashing_st${n}`)}
        />
      </g>

      {/* OUTLET */}
      <TagMonitorCardSVG
        x={n === 1 ? 740 : 710}
        y={695}
        title={`OUTLET ST${n}`}
        value={getMappedValue ? String(getMappedValue(`card_outlet_st${n}`, "MONITOR", "no tag")) : "no tag"}
        unit=""
        status="grey"
        width={150}
        onClick={() => handleEquipmentClick && handleEquipmentClick(`card_outlet_st${n}`)}
        style={getDeveloperStyle(`card_outlet_st${n}`)}
      />

      {/* D.CONDENSATE */}
      <g id={`block_d_cond_st${n}`}>
        <EquipmentIconSVG
          key={`valve_d_cond_st${n}`}
          x={550}
          y={800}
          icon={valveActuatorSvg}
          size={90}
          rotation={0}
          isRunning={isDCondOpen}
        />
        <TagMonitorCardSVG
          x={700}
          y={800}
          title={`D.CONDE DOOR ST${n}`}
          value={dCondTagVal}
          unit=""
          status={isDCondOpen ? "green" : "red"}
          width={150}
          onClick={() => handleEquipmentClick && handleEquipmentClick(`d_cond_st${n}_line`)}
          style={getDeveloperStyle(`d_cond_st${n}_line`)}
        />
      </g>

      {/* CONDENSATE 1 */}
      <g id={`block_condensate_1_st${n}`}>
        {n !== 4 && (
          <EquipmentIconSVG
            key={`valve_condensate_1_st${n}`}
            x={620}
            y={914}
            icon={valveActuatorSvg}
            size={90}
            rotation={270}
            isRunning={isCond1Open}
          />
        )}
        <TagMonitorCardSVG
          x={725}
          y={900}
          title={n === 1 || n === 2 || n === 3 ? `RELIEF CONDENSATE 1 ST${n}` : `RELIEF CONDENSATE 1 ST4`}
          value={cond1TagVal}
          unit=""
          status={isCond1Open ? "green" : "red"}
          width={150}
          onClick={() => handleEquipmentClick && handleEquipmentClick(`card_condensate_1_st${n}`)}
          style={getDeveloperStyle(`card_condensate_1_st${n}`)}
        />
      </g>

      {/* CONDENSATE 2 */}
      <g id={`block_condensate_2_st${n}`}>
        {n !== 4 && (
          <EquipmentIconSVG
            key={`valve_condensate_2_st${n}`}
            x={620}
            y={1005}
            icon={valveActuatorSvg}
            size={90}
            rotation={270}
            isRunning={isCond2Open}
          />
        )}
        <TagMonitorCardSVG
          x={725}
          y={995}
          title={`CONDENSATE 2 ST${n}`}
          value={cond2TagVal}
          unit=""
          status={isCond2Open ? "green" : "red"}
          width={150}
          onClick={() => handleEquipmentClick && handleEquipmentClick(`card_condensate_2_st${n}`)}
          style={getDeveloperStyle(`card_condensate_2_st${n}`)}
        />
      </g>

      {/* PRESSURE & TEMPERATURE CARDS */}
      <TagMonitorCardSVG
        x={380}
        y={380}
        title={`PRESSURE ST${n}`}
        value={getMappedValue ? String(getMappedValue(`overview_pressure_${n}`, "MONITOR", "No Tag")) : "No Tag"}
        unit="Bar"
        status="grey"
        width={150}
        valueColor="#ef4444"
        onClick={() => handleEquipmentClick && handleEquipmentClick(`st${n}_pressure_card`)}
        style={getDeveloperStyle(`st${n}_pressure_card`)}
      />
      <TagMonitorCardSVG
        x={380}
        y={520}
        title={`TEMPERATURE ST${n}`}
        value={getMappedValue ? String(getMappedValue(`overview_temp_${n}`, "MONITOR", "No Tag")) : "No Tag"}
        unit="°C"
        status="grey"
        width={150}
        valueColor="#ef4444"
        onClick={() => handleEquipmentClick && handleEquipmentClick(`st${n}_temp_card`)}
        style={getDeveloperStyle(`st${n}_temp_card`)}
      />

      {/* VALVE MODULATE SETTINGS */}
      <SettingValveModulateSVG
        x={1100}
        y={350}
        scale={1}
        getMappedValue={getMappedValue}
        line={n}
        handleEquipmentClick={handleEquipmentClick}
        getDeveloperStyle={getDeveloperStyle}
      />
    </g>
  );
}

// ==========================================
// 9. TAG CONFIGURATION MODAL
// ==========================================
const TagEditorModal = ({
  data,
  onClose,
  onSave,
  tagMap,
  availableTags = [],
  saving,
}) => {
  const [localTags, setLocalTags] = useState({});

  useEffect(() => {
    if (data) {
      const initial = {};

      if (data.signals && data.signals.length > 0) {
        data.signals.forEach((sig) => {
          const key = `${data.targetId}__${sig.key}`;
          initial[key] = tagMap[key] || "";
        });
      } else {
        const targets = data.subs.length > 0 ? data.subs : [data.targetId];
        targets.forEach((t) => {
          initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
          initial[`${t}__START`] = tagMap[`${t}__START`] || "";
          initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
        });

        if (data.subs.length === 0) {
          initial[`${data.targetId}__MONITOR`] =
            tagMap[`${data.targetId}__MONITOR`] || "";
        }
      }

      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const isGroup = data.subs.length > 0;
  const hasSignals = data.signals && data.signals.length > 0;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        className="som-control-item-label"
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
          display: "block",
        }}
      >
        {label}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#0f172a",
          color: "#e2e8f0",
          fontSize: "12px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">— No Tag —</option>
        {tagList.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.tag_name}
          </option>
        ))}
      </select>
    </div>
  );

  return createPortal(
    <div
      className="som-equipment-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "5vh",
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isGroup ? "800px" : "420px",
          maxHeight: "90vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#f1f5f9",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ⚙️ PLC Tag Configuration
            </h2>
            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              Hardware Mapping: {data.targetId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {hasSignals ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.signals.map((sig) => (
                <div key={sig.key}>
                  {renderTagSelect(
                    localTags[`${data.targetId}__${sig.key}`] || "",
                    (val) =>
                      setLocalTags({
                        ...localTags,
                        [`${data.targetId}__${sig.key}`]: val,
                      }),
                    availableTags,
                    sig.label
                  )}
                </div>
              ))}
            </div>
          ) : isGroup ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {data.subs.map((sub, index) => (
                <div
                  key={index}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(59, 130, 246, 0.15)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "12px",
                      color: "#60a5fa",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {sub}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    {renderTagSelect(
                      localTags[`${sub}__STATUS`] || "",
                      (val) => setLocalTags({ ...localTags, [`${sub}__STATUS`]: val }),
                      availableTags,
                      "STATUS (READ)"
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__START`] || "",
                      (val) => setLocalTags({ ...localTags, [`${sub}__START`]: val }),
                      availableTags,
                      "START (WRITE)"
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__STOP`] || "",
                      (val) => setLocalTags({ ...localTags, [`${sub}__STOP`]: val }),
                      availableTags,
                      "STOP (WRITE)"
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ maxWidth: "320px", margin: "0 auto" }}>
              {renderTagSelect(
                localTags[`${data.targetId}__MONITOR`] || "",
                (val) =>
                  setLocalTags({
                    ...localTags,
                    [`${data.targetId}__MONITOR`]: val,
                  }),
                availableTags,
                "MONITORING POINT (READ)"
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(localTags)}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: saving ? "#475569" : "#3b82f6",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "SAVING..." : "CONFIRM MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==========================================
// 10. MAIN OVERVIEW TAB COMPONENT
// ==========================================
export default function OverviewTab({
  activeTab,
  viewMode,
  handleEquipmentClick,
  condColor,
  st1_inlet, st1_exhaust, st1_cond,
  st2_inlet, st2_exhaust, st2_cond,
  st3_inlet, st3_exhaust, st3_cond,
  st4_inlet, st4_exhaust, st4_cond,
  getMappedValue,
  configMode = false,
  tagMap = {},
  flowBuilder,
}) {
  const svgRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const lv = (eq, sig, def) => getMappedValue(eq, sig, def);

  const getSmartValveValue = useCallback((valveId, fallbackTestVar) => {
    if (getMappedValue) {
      let targetId = valveId.replace("valve_", "card_");

      // Fix D.Cond naming
      if (targetId.startsWith("card_d_cond_")) {
        targetId = targetId.replace("card_d_cond_", "d_cond_");
      }

      // Fix Condensate and Relief Condensate naming mismatch
      if (targetId.includes("card_condensate_1_")) {
        targetId = targetId.replace("card_condensate_1_", "card_relief_condensate_");
      } else if (targetId.includes("card_condensate_2_")) {
        targetId = targetId.replace("card_condensate_2_", "card_condensate_1_");
      }

      // Try reading from MONITOR first
      let mapped = getMappedValue(targetId, "MONITOR", "No Tag");
      if (String(mapped).trim().toLowerCase() === "no tag" || mapped === undefined || mapped === null || String(mapped).trim() === "") {
        mapped = getMappedValue(targetId, "STATUS", "No Tag");
      }

      if (mapped !== undefined && mapped !== null && String(mapped).trim().toLowerCase() !== "no tag") {
        return mapped;
      }
    }
    return fallbackTestVar;
  }, [getMappedValue]);

  const checkMapping = (id) => {
    return tagMap && Object.keys(tagMap).some(key => key.startsWith(`${id}__`) && tagMap[key] && tagMap[key] !== "null" && tagMap[key] !== "undefined" && tagMap[key] !== "");
  };

  const getDeveloperStyle = (id) => {
    if (!configMode) return {};
    const hasMapping = checkMapping(id);
    return {
      outline: hasMapping ? "2px solid #3b82f6" : "2px dashed #ef4444",
      boxShadow: hasMapping ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasMapping ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
    };
  };

  return (
    <div className="som-sterilizer-station-layout">
      <div className="som-sterilizer-station-flow-card">
        <div className="som-sterilizer-station-flow-body">
          <svg
            ref={svgRef}
            viewBox="-450 -120 2850 1300"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* SVG FILTERS & DEFS */}
            <defs>
              <filter id="tint-red" colorInterpolationFilters="sRGB">
                <feColorMatrix
                  type="matrix"
                  values="0.244 0.822 0.083 0 0
                          0     0     0     0 0
                          0     0     0     0 0
                          0     0     0     1 0"
                />
              </filter>
              <filter id="tint-green" colorInterpolationFilters="sRGB">
                <feColorMatrix
                  type="matrix"
                  values="0.0638 0.2146 0.0216 0 0
                          0.2551 0.8582 0.0867 0 0
                          0.0425 0.1430 0.0144 0 0
                          0      0      0      1 0"
                />
              </filter>
              <filter
                id="neon-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite
                  in="SourceGraphic"
                  in2="blur"
                  operator="over"
                />
              </filter>
              <filter
                id="yellow-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="4"
                  floodColor="#ffdb3b"
                  floodOpacity="1"
                />
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="8"
                  floodColor="#ffdb3b"
                  floodOpacity="0.6"
                />
              </filter>
            </defs>

            {/* LAYER 1: BACKGROUND */}
            {activeTab === "overview" ? (
              <image
                href={sterilizerStationImageUrl}
                width="2650"
                x="-355"
                y="-40"
              />
            ) : (
              <image
                href={sterilizerLineImageUrl}
                width="2650"
                x="-200"
                y="-30"
                style={{ mixBlendMode: "multiply" }}
              />
            )}

            {/* LAYER 2: PROCESS FLOWS (PIPES & FLOW ANIMATIONS) — dikomentarkan */}
            <g className="som-steam-flows">
              {/*
              {activeTab === "overview" && (() => {
                const valveVal = getSmartValveValue("valve_inlet_steam_1_st1", "0");
                const isOpen = formatValveStatus(valveVal) === "OPEN";

                return (
                  <g id="overview_inlet_steam_1_st1">
                    {!isOpen && (
                      <LiquidSteamFlowSVG
                        d="M -360,218 L -351,218 Q -343,218 -343,226 L -342,278 Q -342,303 -317,300 L -298,296"
                        active={true}
                        mode="standby"
                        color="#38bdf8"
                        thickness={8}
                      />
                    )}
                    {isOpen && (
                      <>
                        <LiquidSteamFlowSVG
                          d="M -360,218 L -351,218 Q -343,218 -343,226 L -342,278 Q -342,303 -317,300 L -298,296"
                          active={true}
                          mode="flowing"
                          color="#38bdf8"
                          thickness={8}
                        />
                        <LiquidSteamFlowSVG
                          d="M -247,296 L 118,296"
                          active={true}
                          mode="flowing"
                          color="#38bdf8"
                          thickness={8}
                        />
                      </>
                    )}
                  </g>
                );
              })()}
              */}
            </g>

            {/* LAYER 3: UNIFIED INDIVIDUAL LINE VIEWS */}
            {(activeTab === "line1" ||
              activeTab === "line2" ||
              activeTab === "line3" ||
              activeTab === "line4") &&
              (() => {
                const lineNum =
                  activeTab === "line1"
                    ? 1
                    : activeTab === "line2"
                      ? 2
                      : activeTab === "line3"
                        ? 3
                        : 4;

                return (
                  <g>
                    {/* Flow Line Indicators — dikomentarkan */}
                    <g className="som-line-flows">
                      {/*
                      {lineNum === 4 && (true || parseFloat(lv("flow_1784282895579", "FLOW", "0")) > 0) && (
                        <LiquidFlowSVG
                          d="M 265,143 L 264,98 Q 263,81 247,78 L 247,78 Q 230,74 213,74 L 171,73"
                          isRunning={true}
                          color="#38bdf8"
                          thickness={8}
                        />
                      )}
                      {lineNum === 3 && (true || parseFloat(lv("flow_1784254637309", "FLOW", "0")) > 0) && (
                        <LiquidFlowSVG
                          d="M 265,143 L 266,112 Q 266,98 259,86 L 259,86 Q 252,73 238,73 L 170,73"
                          isRunning={true}
                          color="#38bdf8"
                          thickness={8}
                        />
                      )}
                      */}
                    </g>

                    {/* Render Consolidated Line Blocks (valve_positioner tetap tampil di dalamnya) */}
                    <LineEquipmentBlocks
                      line={lineNum}
                      getMappedValue={getMappedValue}
                      handleEquipmentClick={handleEquipmentClick}
                      getDeveloperStyle={getDeveloperStyle}
                    />
                  </g>
                );
              })()}

            {/* LAYER 4: OVERVIEW MONITOR CARDS & STERILIZER PANELS */}
            {activeTab === "overview" && (
              <>
                {/* Overview Equipment Icons (Dynamic Mapping by Group) */}
                {OVERVIEW_EQUIPMENT_ICONS.map((item) => {
                  const mapped = getMappedValue ? getMappedValue(item.cardId, "MONITOR", "0") : "0";
                  const num = parseFloat(mapped);
                  const isRunning = !isNaN(num)
                    ? num > 0
                    : String(mapped).toLowerCase() === "open" || mapped === "true" || mapped === "1";

                  return (
                    <EquipmentIconSVG
                      key={item.id}
                      x={item.x}
                      y={item.y}
                      icon={item.icon}
                      size={item.size || 90}
                      rotation={item.rotation || 0}
                      isRunning={isRunning}
                      onClick={() => handleEquipmentClick && handleEquipmentClick(item.cardId)}
                      style={getDeveloperStyle(item.cardId)}
                    />
                  );
                })}

                {/* TAG MONITOR CARDS (overview) */}
                {TAG_MONITOR_CARDS.map((card) => {
                  return (
                    <TagMonitorCardSVG
                      key={card.id}
                      x={card.x}
                      y={card.y}
                      title={card.title}
                      value={(() => {
                        if (!getMappedValue) return "No Tag";
                        const mapped = getMappedValue(card.id, "MONITOR", "No Tag");
                        if (String(mapped).trim().toLowerCase() === "no tag" || mapped === undefined || mapped === null) {
                          return "No Tag";
                        }
                        if (
                          card.id.startsWith("card_inlet_door_st") ||
                          card.id.startsWith("card_outlet_door_st") ||
                          card.id.startsWith("d_cond_st")
                        ) {
                          if (mapped === true || mapped === "true" || mapped === "1" || mapped === 1) return "OPEN";
                          if (mapped === false || mapped === "false" || mapped === "0" || mapped === 0) return "CLOSE";
                        }
                        return String(mapped);
                      })()}
                      unit={(() => {
                        if (!getMappedValue) return card.unit;
                        const mapped = getMappedValue(card.id, "MONITOR", "No Tag");
                        if (String(mapped).trim().toLowerCase() === "no tag" || mapped === undefined || mapped === null || mapped === "--") {
                          return "";
                        }
                        return card.unit;
                      })()}
                      valueColor={card.valueColor}
                      status={card.status}
                      width={card.width}
                      scale={card.scale || 1}
                      headerPadding={card.headerPadding}
                      bodyPadding={card.bodyPadding}
                      onClick={() => handleEquipmentClick && handleEquipmentClick(card.id)}
                      style={getDeveloperStyle(card.id)}
                    />
                  );
                })}

                {/* 4 STERILIZER OVERVIEW STATUS PANELS */}
                {[1, 2, 3, 4].map((n) => {
                  const xPos = n === 1 ? -20 : n === 2 ? 645 : n === 3 ? 1310 : 1970;
                  return (
                    <g key={`st${n}_overview_group`}>
                      <SterilizerStatusPanelSVG
                        key={`st${n}_status`}
                        x={xPos}
                        y={520}
                        title={`STERILIZER ${n}`}
                        status={getMappedValue ? String(getMappedValue(`st${n}_status`, "STATUS", "EMERGENCY")) : "EMERGENCY"}
                        recipe={getMappedValue ? String(getMappedValue(`st${n}_recipe`, "STATUS", "NORMAL")) : "NORMAL"}
                        actualStep={getMappedValue ? String(getMappedValue(`st${n}_status`, "STEP", "No Tag")) : "No Tag"}
                        totalTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "TOTAL_TIME", "No Tag")) : "No Tag"}
                        doorIn={formatDoorStatus(getMappedValue ? getMappedValue(`st${n}_status`, "DOOR_IN", "No Tag") : "No Tag")}
                        doorOut={formatDoorStatus(getMappedValue ? getMappedValue(`st${n}_status`, "DOOR_OUT", "No Tag") : "No Tag")}
                        pressure={getMappedValue ? String(getMappedValue(`st${n}_status`, "PRESSURE", "No Tag")) : "No Tag"}
                        temp={getMappedValue ? String(getMappedValue(`st${n}_status`, "TEMP", "No Tag")) : "No Tag"}
                        scale={0.95}
                        onClick={() => handleEquipmentClick && handleEquipmentClick(`st${n}_status`)}
                        style={getDeveloperStyle(`st${n}_status`)}
                      />
                    </g>
                  );
                })}
                {/* WT FLOW BUILDER OVERLAY */}
                {flowBuilder && (
                  <WTFlowOverlay
                    flows={flowBuilder.flows}
                    activeFlowIdx={flowBuilder.activeFlowIdx}
                    isActive={flowBuilder.isActive}
                    isPlacing={flowBuilder.isPlacing}
                    onPointDrag={flowBuilder.updatePoint}
                    onInsertPoint={flowBuilder.insertPoint}
                    onDeletePoint={flowBuilder.deletePoint}
                    onSelectFlow={flowBuilder.setActiveFlowIdx}
                    onCanvasClick={flowBuilder.addPointToActiveFlow}
                  />
                )}
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}