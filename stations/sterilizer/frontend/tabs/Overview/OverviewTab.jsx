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
import valvePneumaticActuatorSvg from "../../assets/item/valve_pneumatic_actuator.svg";
import topOpenPng from "../../assets/TOP_OPEN-removebg-up.png";
import topClosePng from "../../assets/TOP_CLOSE-removebg-up.png";
import botOpenPng from "../../assets/BOT_OPEN.png";
import botClosePng from "../../assets/BOT_CLOSE.png";

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

const TOP_DOORS_CONFIG = [
  // --- STERILIZER 1 (ST1) INLET DOOR ---
  {
    n: 1,
    openX: -135,
    openY: -17,
    openW: 100,
    openH: 160,
    closeX: -100,
    closeY: 15,
    closeW: 164,
    closeH: 188,
  },
  // --- STERILIZER 2 (ST2) INLET DOOR ---
  {
    n: 2,
    openX: 510,
    openY: -17,
    openW: 120,
    openH: 160,
    closeX: 560,
    closeY: 15,
    closeW: 164,
    closeH: 188,
  },
  // --- STERILIZER 3 (ST3) INLET DOOR ---
  {
    n: 3,
    openX: 1193,
    openY: -17,
    openW: 100,
    openH: 160,
    closeX: 1225,
    closeY: 15,
    closeW: 164,
    closeH: 188,
  },
  // --- STERILIZER 4 (ST4) INLET DOOR ---
  {
    n: 4,
    openX: 1860,
    openY: -17,
    openW: 90,
    openH: 160,
    closeX: 1885,
    closeY: 15,
    closeW: 164,
    closeH: 188,
  },
];

const BOT_DOORS_CONFIG = [
  // --- STERILIZER 1 (ST1) OUTLET DOOR ---
  {
    n: 1,
    openX: -434,
    openY: 668,
    openW: 190,
    openH: 190,
    openRotation: -5,
    closeX: -345,
    closeY: 730,
    closeW: 164,
    closeH: 188,
    closeRotation: 0,
  },
  // --- STERILIZER 2 (ST2) OUTLET DOOR ---
  {
    n: 2,
    openX: 224,
    openY: 668,
    openW: 190,
    openH: 190,
    openRotation: -5,
    closeX: 317,
    closeY: 730,
    closeW: 164,
    closeH: 188,
    closeRotation: 0,
  },
  // --- STERILIZER 3 (ST3) OUTLET DOOR ---
  {
    n: 3,
    openX: 890,
    openY: 668,
    openW: 190,
    openH: 190,
    openRotation: -5,
    closeX: 980,
    closeY: 730,
    closeW: 164,
    closeH: 188,
    closeRotation: 0,
  },
  // --- STERILIZER 4 (ST4) OUTLET DOOR ---
  {
    n: 4,
    openX: 1554,
    openY: 668,
    openW: 190,
    openH: 190,
    openRotation: -5,
    closeX: 1640,
    closeY: 730,
    closeW: 164,
    closeH: 188,
    closeRotation: 0,
  },
];

// Individual Line View (line1, line2, line3, line4) Doors Config
const LINE_TOP_DOOR_CONFIG = {
  openX: 630,
  openY: -30,
  openW: 130,
  openH: 190,
  openRotation: 0,
  closeX: 682,
  closeY: 22,
  closeW: 170,
  closeH: 195,
  closeRotation: 0,
};

const LINE_BOT_DOOR_CONFIG = {
  openX: 345,
  openY: 680,
  openW: 190,
  openH: 190,
  openRotation: -5,
  closeX: 435,
  closeY: 740,
  closeW: 170,
  closeH: 195,
  closeRotation: 0,
};

// Overview Tag Monitor Cards (Grouped by Station)
const TAG_MONITOR_CARDS = [
  // --- COMMON / GLOBAL CARDS ---
  { id: "bpv_pressure", x: -430, y: 70, title: "BPV PRESSURE", defaultVal: "no tag", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "boiler_pressure", x: -430, y: 140, title: "BOILER PRESSURE", defaultVal: "no tag", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },

  // --- STERILIZER 1 (ST1) ---
  { id: "card_exhaust_steam_st1", x: 190, y: 170, title: "EXHAUST STEAM ST1", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_inlet_steam_1_st1", x: -185, y: 50, title: "INLET STEAM 1 ST1", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st1", x: -240, y: 210, title: "INLET STEAM 2 ST1", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st1", x: -240, y: 430, title: "INLET STEAM 3 ST1", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st1", x: -240, y: 550, title: "INLET STEAM 4 ST1", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st1", x: -400, y: 690, title: "FLASHING ST1", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st1", x: -20, y: 235, title: "INLET DOOR ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st1", x: -80, y: 780, title: "OUTLET DOOR ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_1", x: -20, y: 340, title: "PRESSURE 1", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_1", x: -20, y: 700, title: "TEMPERATURE 1", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st1", x: -440, y: 975, title: "D. COND ST1", defaultVal: "0", unit: "%", status: "red", width: 150, scale: 1 },
  { id: "card_relief_condensate_st1", x: -440, y: 1055, title: "RELIEF CONDENSATE VALVE ST1", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_condensate_1_st1", x: -440, y: 1120, title: "CONDENSATE ST1", defaultVal: "0", unit: "%", status: "red", width: 150 },

  // --- STERILIZER 2 (ST2) ---
  { id: "card_exhaust_steam_st2", x: 850, y: 170, title: "EXHAUST STEAM ST2", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_inlet_steam_1_st2", x: 500, y: 50, title: "INLET STEAM 1 ST2", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st2", x: 420, y: 210, title: "INLET STEAM 2 ST2", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st2", x: 420, y: 430, title: "INLET STEAM 3 ST2", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st2", x: 420, y: 550, title: "INLET STEAM 4 ST2", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st2", x: 260, y: 690, title: "FLASHING ST2", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st2", x: 645, y: 235, title: "INLET DOOR ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st2", x: 648, y: 780, title: "OUTLET DOOR ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_2", x: 645, y: 340, title: "PRESSURE 2", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_2", x: 645, y: 700, title: "TEMPERATURE 2", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st2", x: 220, y: 975, title: "D. COND ST2", defaultVal: "0", unit: "%", status: "red", width: 150, scale: 1 },
  { id: "card_relief_condensate_st2", x: 220, y: 1050, title: "RELIEF CONDENSATE VALVE ST2", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_condensate_1_st2", x: 220, y: 1120, title: "CONDENSATE ST2", defaultVal: "0", unit: "%", status: "red", width: 150 },

  // --- STERILIZER 3 (ST3) ---
  { id: "card_exhaust_steam_st3", x: 1515, y: 170, title: "EXHAUST STEAM ST3", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_inlet_steam_1_st3", x: 1170, y: 50, title: "INLET STEAM 1 ST3", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st3", x: 1085, y: 210, title: "INLET STEAM 2 ST3", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st3", x: 1085, y: 430, title: "INLET STEAM 3 ST3", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st3", x: 1085, y: 550, title: "INLET STEAM 4 ST3", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st3", x: 925, y: 690, title: "FLASHING ST3", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st3", x: 1310, y: 235, title: "INLET DOOR ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st3", x: 1245, y: 780, title: "OUTLET DOOR ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_3", x: 1310, y: 340, title: "PRESSURE 3", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_3", x: 1310, y: 700, title: "TEMPERATURE 3", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st3", x: 885, y: 975, title: "D. COND ST3", defaultVal: "0", unit: "%", status: "red", width: 150, scale: 1 },
  { id: "card_relief_condensate_st3", x: 885, y: 1050, title: "RELIEF CONDENSATE VALVE ST3", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_condensate_1_st3", x: 885, y: 1120, title: "CONDENSATE ST3", defaultVal: "0", unit: "%", status: "red", width: 150 },

  // --- STERILIZER 4 (ST4) ---
  { id: "card_exhaust_steam_st4", x: 2175, y: 170, title: "EXHAUST STEAM ST4", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_inlet_steam_1_st4", x: 1830, y: 50, title: "INLET STEAM 1 ST4", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_2_st4", x: 1745, y: 210, title: "INLET STEAM 2 ST4", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_3_st4", x: 1745, y: 430, title: "INLET STEAM 3 ST4", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_steam_4_st4", x: 1745, y: 550, title: "INLET STEAM 4 ST4", defaultVal: "0", unit: "%", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_flashing_st4", x: 1585, y: 690, title: "FLASHING ST4", defaultVal: "CLOSE", unit: "", status: "red", width: 120, headerPadding: "2px 4px", bodyPadding: "3px 4px" },
  { id: "card_inlet_door_st4", x: 1970, y: 235, title: "INLET DOOR ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st4", x: 1905, y: 780, title: "OUTLET DOOR ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "overview_pressure_4", x: 1970, y: 340, title: "PRESSURE 4", defaultVal: "0.0", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "overview_temp_4", x: 1965, y: 700, title: "TEMPERATURE 4", defaultVal: "0.0", unit: "°C", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "d_cond_st4", x: 1545, y: 975, title: "D. COND ST4", defaultVal: "0", unit: "%", status: "red", width: 150, scale: 1 },
  { id: "card_relief_condensate_st4", x: 1545, y: 1050, title: "RELIEF CONDENSATE VALVE ST4", defaultVal: "0", unit: "%", status: "red", width: 150 },
  { id: "card_condensate_1_st4", x: 1545, y: 1120, title: "CONDENSATE ST4", defaultVal: "0", unit: "%", status: "red", width: 150 },
];

// Overview Equipment Icons (Grouped by Station)
const OVERVIEW_EQUIPMENT_ICONS = [
  // --- STERILIZER 1 (ST1) ICONS ---
  { id: "overview_inlet_steam_1_st1_icon", cardId: "card_inlet_steam_1_st1", x: -312, y: 40, icon: valvePneumaticActuatorSvg, size: 55, rotation: 180 },
  { id: "overview_inlet_steam_2_st1_icon", cardId: "card_inlet_steam_2_st1", x: -245, y: 130, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_3_st1_icon", cardId: "card_inlet_steam_3_st1", x: -245, y: 350, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_4_st1_icon", cardId: "card_inlet_steam_4_st1", x: -245, y: 612, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_flashing_st1_icon", cardId: "card_flashing_st1", x: -270, y: 695, icon: valvePositionerSvg, size: 60, rotation: 270 },
  { id: "overview_d_cond_st1_icon", cardId: "d_cond_st1", x: -310, y: 947, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_relief_condensate_st1_icon", cardId: "card_relief_condensate_st1", x: -310, y: 1026, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_condensate_1_st1_icon", cardId: "card_condensate_1_st1", x: -310, y: 1106, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_exhaust_steam_st1_icon", cardId: "card_exhaust_steam_st1", x: 180, y: 88, icon: valvePositionerSvg, size: 90, rotation: 270 },

  // --- STERILIZER 2 (ST2) ICONS ---
  { id: "overview_inlet_steam_1_st2_icon", cardId: "card_inlet_steam_1_st2", x: 350, y: 40, icon: valvePneumaticActuatorSvg, size: 55, rotation: 180 },
  { id: "overview_inlet_steam_2_st2_icon", cardId: "card_inlet_steam_2_st2", x: 415, y: 128, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_3_st2_icon", cardId: "card_inlet_steam_3_st2", x: 415, y: 349, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_4_st2_icon", cardId: "card_inlet_steam_4_st2", x: 415, y: 610, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_flashing_st2_icon", cardId: "card_flashing_st2", x: 390, y: 695, icon: valvePositionerSvg, size: 60, rotation: 270 },
  { id: "overview_d_cond_st2_icon", cardId: "d_cond_st2", x: 350, y: 945, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_relief_condensate_st2_icon", cardId: "card_relief_condensate_st2", x: 350, y: 1024, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_condensate_1_st2_icon", cardId: "card_condensate_1_st2", x: 350, y: 1105, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_exhaust_steam_st2_icon", cardId: "card_exhaust_steam_st2", x: 840, y: 86, icon: valvePositionerSvg, size: 90, rotation: 270 },

  // --- STERILIZER 3 (ST3) ICONS ---
  { id: "overview_inlet_steam_1_st3_icon", cardId: "card_inlet_steam_1_st3", x: 1015, y: 40, icon: valvePneumaticActuatorSvg, size: 55, rotation: 180 },
  { id: "overview_inlet_steam_2_st3_icon", cardId: "card_inlet_steam_2_st3", x: 1080, y: 128, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_3_st3_icon", cardId: "card_inlet_steam_3_st3", x: 1080, y: 349, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_inlet_steam_4_st3_icon", cardId: "card_inlet_steam_4_st3", x: 1080, y: 610, icon: valvePositionerSvg, size: 90, rotation: 270 },
  { id: "overview_flashing_st3_icon", cardId: "card_flashing_st3", x: 1055, y: 695, icon: valvePositionerSvg, size: 60, rotation: 270 },
  { id: "overview_d_cond_st3_icon", cardId: "d_cond_st3", x: 1015, y: 945, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_relief_condensate_st3_icon", cardId: "card_relief_condensate_st3", x: 1015, y: 1024, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_condensate_1_st3_icon", cardId: "card_condensate_1_st3", x: 1015, y: 1104, icon: valvePositionerSvg, size: 80, rotation: 270 },
  { id: "overview_exhaust_steam_st3_icon", cardId: "card_exhaust_steam_st3", x: 1505, y: 86, icon: valvePositionerSvg, size: 90, rotation: 270 },

  // --- STERILIZER 4 (ST4) ICONS ---
  { id: "overview_inlet_steam_1_st4_icon", cardId: "card_inlet_steam_1_st4", x: 1677, y: 40, icon: valvePneumaticActuatorSvg, size: 55, rotation: 180 },
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
const isValValid = (v) => {
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s !== "" && s !== "no tag" && s !== "--";
};

const formatDoorStatus = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return "--";
  if (rawVal === "No Tag" || String(rawVal).trim().toLowerCase() === "no tag") return "No Tag";
  if (rawVal === "--") return "--";
  if (typeof rawVal === "boolean") {
    return rawVal ? "OPEN" : "CLOSE";
  }
  const str = String(rawVal).toLowerCase().trim();
  if (str === "no tag") return "No Tag";
  if (str === "--") return "--";
  if (str === "true" || str === "open") return "OPEN";
  if (str === "false" || str === "close") return "CLOSE";
  const num = parseFloat(rawVal);
  if (!isNaN(num)) {
    return num > 0 ? "OPEN" : "CLOSE";
  }
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

const resolveSterilizerValves = (stNum, getMappedValue) => {
  const getVal = (id) => {
    const card = TAG_MONITOR_CARDS.find((c) => c.id === id);
    const def = card ? (card.defaultVal || "0") : "0";
    const v = getMappedValue ? getMappedValue(id, "MONITOR", def) : def;
    if (!isValValid(v)) {
      return def;
    }
    return String(v);
  };
  const isOpen = (id) => {
    const v = getVal(id);
    const num = parseFloat(v);
    const str = String(v).trim().toLowerCase();
    return !isNaN(num) ? num > 0 : (str === "open" || str === "true" || str === "1");
  };
  const inlet1 = isOpen(`card_inlet_steam_1_st${stNum}`);
  return {
    isInlet1Open: inlet1,
    isInlet2Open: isOpen(`card_inlet_steam_2_st${stNum}`) && inlet1,
    isInlet3Open: isOpen(`card_inlet_steam_3_st${stNum}`) && inlet1,
    isInlet4Open: isOpen(`card_inlet_steam_4_st${stNum}`) && inlet1,
    isFlashOpen: isOpen(`card_flashing_st${stNum}`) && inlet1,
    isExhaustOpen: isOpen(`card_exhaust_steam_st${stNum}`),
    isDCondOpen: isOpen(`d_cond_st${stNum}`),
    isCond1Open: isOpen(`card_condensate_1_st${stNum}`),
    isReliefOpen: isOpen(`card_relief_condensate_st${stNum}`),
  };
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
  position = "0.0",
  onClick,
  style = {},
}) => {
  const isNoTag = !position || String(position).toLowerCase() === "no tag";
  const isOffline = String(position) === "--";
  const numPos = isNoTag || isOffline ? 0 : Math.min(100, Math.max(0, parseFloat(position) || 0));
  const displayPos = isNoTag ? "No Tag" : isOffline ? "--" : `${numPos.toFixed(1)}%`;

  const statusLabel = isNoTag ? "No Tag" : isOffline ? "Offline" : numPos === 0 ? "CLOSED" : numPos === 100 ? "FULLY OPEN" : `${numPos.toFixed(0)}% OPEN`;
  const badgeBg = isNoTag || isOffline ? "#f1f5f9" : numPos > 0 ? "#f0fdf4" : "#fef2f2";
  const badgeColor = isNoTag || isOffline ? "#64748b" : numPos > 0 ? "#16a34a" : "#ef4444";

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-95, -55)`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <foreignObject width="190" height="115" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
            padding: "10px 12px",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            userSelect: "none",
            ...style,
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
            <span style={{ fontSize: "9px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              POSITION
            </span>
            <span style={{ fontSize: "9px", fontWeight: "900", background: badgeBg, color: badgeColor, padding: "2px 6px", borderRadius: "4px", border: `1px solid ${badgeColor}33` }}>
              {statusLabel}
            </span>
          </div>

          <div style={{ position: "relative", width: "100%", height: "24px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
            <div
              style={{
                width: `${numPos}%`,
                height: "100%",
                background: numPos > 0 ? "linear-gradient(90deg, #ffdb3b, #d4ac0d)" : "transparent",
                transition: "width 0.4s ease",
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
                color: isNoTag ? "#94a3b8" : "#0f172a",
              }}
            >
              {displayPos}
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

  // Interlock Master Inlet Steam 1: Jika Inlet Steam 1 = 0 / CLOSE, valve cabang (Inlet 2, 3, 4 & Flashing) menjadi MERAH / nonaktif
  const rawInlet1 = getMappedValue ? getMappedValue(`card_inlet_steam_1_st${n}`, "MONITOR", "CLOSE") : "CLOSE";
  const strInlet1 = !isValValid(rawInlet1) ? "CLOSE" : String(rawInlet1);
  const numInlet1 = parseFloat(strInlet1);
  const isInlet1Open = !isNaN(numInlet1) ? numInlet1 > 0 : (strInlet1.trim().toLowerCase() === "open" || strInlet1 === "true" || strInlet1 === "1");

  return (
    <g id={`line${n}_equipment_blocks`}>
      {/* 1. EXHAUST STEAM (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_exhaust_steam_st${n}`, "MONITOR", "0") : "0";
        const tagVal = !isValValid(rawTagVal) ? "0" : String(rawTagVal);
        const numericVal = parseFloat(tagVal);
        const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal.trim().toLowerCase() === "open" || tagVal === "true" || tagVal === "1");
        return (
          <g id={`block_exhaust_steam_st${n}`}>
            <EquipmentIconSVG
              key={`valve_exhaust_steam_st${n}`}
              x={938}
              y={100}
              icon={valvePositionerSvg}
              size={75}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_exhaust_steam_st${n}`)}
              style={getDeveloperStyle(`card_exhaust_steam_st${n}`)}
            />
            <TagMonitorCardSVG
              x={1030}
              y={80}
              title={`EXHAUST STEAM ST${n}`}
              value={tagVal}
              unit="%"
              status={isOpen ? "green" : "red"}
              width={140}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_exhaust_steam_st${n}`)}
              style={getDeveloperStyle(`card_exhaust_steam_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 2. INLET STEAM 1 (VALVE PNEUMATIC ACTUATOR + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_inlet_steam_1_st${n}`, "MONITOR", "CLOSE") : "CLOSE";
        const isNoTag = !isValValid(rawTagVal);
        const tagVal = isNoTag ? "CLOSE" : formatValveStatus(rawTagVal);
        const isOpen = tagVal === "OPEN";
        return (
          <g id={`block_inlet_steam_1_st${n}`}>
            <EquipmentIconSVG
              key={`valve_inlet_steam_1_st${n}`}
              x={468}
              y={78}
              icon={valvePneumaticActuatorSvg}
              size={50}
              rotation={180}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_1_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_1_st${n}`)}
            />
            <TagMonitorCardSVG
              x={555}
              y={70}
              title={`INLET STEAM 1 ST${n}`}
              value={tagVal}
              unit=""
              status={isOpen ? "green" : "red"}
              width={130}
              headerPadding="2px 4px"
              bodyPadding="3px 4px"
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_1_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_1_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 3. INLET STEAM 2 (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_inlet_steam_2_st${n}`, "MONITOR", "0") : "0";
        const tagVal = !isValValid(rawTagVal) ? "0" : String(rawTagVal);
        const numericVal = parseFloat(tagVal);
        const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal.trim().toLowerCase() === "open" || tagVal === "true" || tagVal === "1");
        return (
          <g id={`block_inlet_steam_2_st${n}`}>
            <EquipmentIconSVG
              key={`valve_inlet_steam_2_st${n}`}
              x={530}
              y={143}
              icon={valvePositionerSvg}
              size={75}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_2_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_2_st${n}`)}
            />
            <TagMonitorCardSVG
              x={545}
              y={212}
              title={`INLET STEAM 2 ST${n}`}
              value={tagVal}
              unit="%"
              status={isOpen ? "green" : "red"}
              width={130}
              headerPadding="2px 4px"
              bodyPadding="3px 4px"
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_2_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_2_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 4. INLET STEAM 3 (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_inlet_steam_3_st${n}`, "MONITOR", "0") : "0";
        const tagVal = !isValValid(rawTagVal) ? "0" : String(rawTagVal);
        const numericVal = parseFloat(tagVal);
        const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal.trim().toLowerCase() === "open" || tagVal === "true" || tagVal === "1");
        return (
          <g id={`block_inlet_steam_3_st${n}`}>
            <EquipmentIconSVG
              key={`valve_inlet_steam_3_st${n}`}
              x={530}
              y={360}
              icon={valvePositionerSvg}
              size={75}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_3_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_3_st${n}`)}
            />
            <TagMonitorCardSVG
              x={545}
              y={430}
              title={`INLET STEAM 3 ST${n}`}
              value={tagVal}
              unit="%"
              status={isOpen ? "green" : "red"}
              width={130}
              headerPadding="2px 4px"
              bodyPadding="3px 4px"
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_3_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_3_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 5. INLET STEAM 4 (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_inlet_steam_4_st${n}`, "MONITOR", "0") : "0";
        const tagVal = !isValValid(rawTagVal) ? "0" : String(rawTagVal);
        const numericVal = parseFloat(tagVal);
        const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal.trim().toLowerCase() === "open" || tagVal === "true" || tagVal === "1");
        return (
          <g id={`block_inlet_steam_4_st${n}`}>
            <EquipmentIconSVG
              key={`valve_inlet_steam_4_st${n}`}
              x={530}
              y={624}
              icon={valvePositionerSvg}
              size={75}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_4_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_4_st${n}`)}
            />
            <TagMonitorCardSVG
              x={545}
              y={568}
              title={`INLET STEAM 4 ST${n}`}
              value={tagVal}
              unit="%"
              status={isOpen ? "green" : "red"}
              width={130}
              headerPadding="2px 4px"
              bodyPadding="3px 4px"
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_steam_4_st${n}`)}
              style={getDeveloperStyle(`card_inlet_steam_4_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 6. FLASHING (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_flashing_st${n}`, "MONITOR", "CLOSE") : "CLOSE";
        const isNoTag = !isValValid(rawTagVal);
        const tagVal = isNoTag ? "CLOSE" : formatValveStatus(rawTagVal);
        const isOpen = tagVal === "OPEN";
        return (
          <g id={`block_flashing_st${n}`}>
            <EquipmentIconSVG
              key={`valve_flashing_st${n}`}
              x={510}
              y={706}
              icon={valvePositionerSvg}
              size={60}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_flashing_st${n}`)}
              style={getDeveloperStyle(`card_flashing_st${n}`)}
            />
            <TagMonitorCardSVG
              x={369}
              y={700}
              title={`FLASHING ST${n}`}
              value={tagVal}
              unit=""
              status={isOpen ? "green" : "red"}
              width={130}
              headerPadding="2px 4px"
              bodyPadding="3px 4px"
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_flashing_st${n}`)}
              style={getDeveloperStyle(`card_flashing_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 7. D. CONDENSATE (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`d_cond_st${n}`, "MONITOR", "0") : "0";
        const tagVal = !isValValid(rawTagVal) ? "0" : String(rawTagVal);
        const numericVal = parseFloat(tagVal);
        const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal.trim().toLowerCase() === "open" || tagVal === "true" || tagVal === "1");
        return (
          <g id={`block_d_cond_st${n}`}>
            <EquipmentIconSVG
              key={`valve_d_cond_st${n}`}
              x={475}
              y={957}
              icon={valvePositionerSvg}
              size={75}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`d_cond_st${n}`)}
              style={getDeveloperStyle(`d_cond_st${n}`)}
            />
            <TagMonitorCardSVG
              x={360}
              y={957}
              title={`D. COND ST${n}`}
              value={tagVal}
              unit="%"
              status={isOpen ? "green" : "red"}
              width={130}
              scale={1}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`d_cond_st${n}`)}
              style={getDeveloperStyle(`d_cond_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 8. RELIEF CONDENSATE (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_relief_condensate_st${n}`, "MONITOR", "0") : "0";
        const tagVal = !isValValid(rawTagVal) ? "0" : String(rawTagVal);
        const numericVal = parseFloat(tagVal);
        const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal.trim().toLowerCase() === "open" || tagVal === "true" || tagVal === "1");
        return (
          <g id={`block_relief_condensate_st${n}`}>
            <EquipmentIconSVG
              key={`valve_relief_condensate_st${n}`}
              x={475}
              y={1035}
              icon={valvePositionerSvg}
              size={75}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_relief_condensate_st${n}`)}
              style={getDeveloperStyle(`card_relief_condensate_st${n}`)}
            />
            <TagMonitorCardSVG
              x={360}
              y={1030}
              title={`RELIEF COND ST${n}`}
              value={tagVal}
              unit="%"
              status={isOpen ? "green" : "red"}
              width={130}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_relief_condensate_st${n}`)}
              style={getDeveloperStyle(`card_relief_condensate_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 9. CONDENSATE 1 (VALVE POSITIONER + CARD) */}
      {(() => {
        const rawTagVal = getMappedValue ? getMappedValue(`card_condensate_1_st${n}`, "MONITOR", "0") : "0";
        const tagVal = !isValValid(rawTagVal) ? "0" : String(rawTagVal);
        const numericVal = parseFloat(tagVal);
        const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal.trim().toLowerCase() === "open" || tagVal === "true" || tagVal === "1");
        return (
          <g id={`block_condensate_1_st${n}`}>
            <EquipmentIconSVG
              key={`valve_condensate_1_st${n}`}
              x={475}
              y={1117}
              icon={valvePositionerSvg}
              size={75}
              rotation={270}
              isRunning={isOpen}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_condensate_1_st${n}`)}
              style={getDeveloperStyle(`card_condensate_1_st${n}`)}
            />
            <TagMonitorCardSVG
              x={360}
              y={1108}
              title={`CONDENSATE ST${n}`}
              value={tagVal}
              unit="%"
              status={isOpen ? "green" : "red"}
              width={130}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_condensate_1_st${n}`)}
              style={getDeveloperStyle(`card_condensate_1_st${n}`)}
            />
          </g>
        );
      })()}

      {/* 10. DOORS */}
      {(() => {
        const rawInletDoor = getMappedValue ? getMappedValue(`card_inlet_door_st${n}`, "MONITOR", "no tag") : "no tag";
        const valInletDoor = formatDoorStatus(rawInletDoor);
        const statusInlet = valInletDoor === "OPEN" ? "green" : valInletDoor === "CLOSE" ? "red" : "grey";

        const rawOutletDoor = getMappedValue ? getMappedValue(`card_outlet_door_st${n}`, "MONITOR", "no tag") : "no tag";
        const valOutletDoor = formatDoorStatus(rawOutletDoor);
        const statusOutlet = valOutletDoor === "OPEN" ? "green" : valOutletDoor === "CLOSE" ? "red" : "grey";

        return (
          <>
            <TagMonitorCardSVG
              x={770}
              y={245}
              title={`INLET DOOR ST${n}`}
              value={valInletDoor}
              unit=""
              status={statusInlet}
              width={150}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_inlet_door_st${n}`)}
              style={getDeveloperStyle(`card_inlet_door_st${n}`)}
            />
            <TagMonitorCardSVG
              x={700}
              y={790}
              title={`OUTLET DOOR ST${n}`}
              value={valOutletDoor}
              unit=""
              status={statusOutlet}
              width={150}
              onClick={() => handleEquipmentClick && handleEquipmentClick(`card_outlet_door_st${n}`)}
              style={getDeveloperStyle(`card_outlet_door_st${n}`)}
            />
          </>
        );
      })()}

      {/* 11. PRESSURE & TEMPERATURE CARDS */}
      <TagMonitorCardSVG
        x={770}
        y={340}
        title={`PRESSURE ${n}`}
        value={getMappedValue ? String(getMappedValue(`overview_pressure_${n}`, "MONITOR", "0.0")) : "0.0"}
        unit="Bar"
        status="grey"
        width={170}
        valueColor="#ef4444"
        onClick={() => handleEquipmentClick && handleEquipmentClick(`overview_pressure_${n}`)}
        style={getDeveloperStyle(`overview_pressure_${n}`)}
      />
      <TagMonitorCardSVG
        x={770}
        y={708}
        title={`TEMPERATURE ${n}`}
        value={getMappedValue ? String(getMappedValue(`overview_temp_${n}`, "MONITOR", "0.0")) : "0.0"}
        unit="°C"
        status="grey"
        width={170}
        valueColor="#ef4444"
        onClick={() => handleEquipmentClick && handleEquipmentClick(`overview_temp_${n}`)}
        style={getDeveloperStyle(`overview_temp_${n}`)}
      />

      {/* 12. STERILIZER STATUS PANEL */}
      <SterilizerStatusPanelSVG
        key={`st${n}_status_panel_line`}
        x={770}
        y={540}
        title={`STERILIZER ${n}`}
        status={getMappedValue ? String(getMappedValue(`st${n}_status`, "STATUS", "EMERGENCY")) : "EMERGENCY"}
        mode={getMappedValue ? String(getMappedValue(`st${n}_status`, "MODE", "AUTO")) : "AUTO"}
        recipe={getMappedValue ? String(getMappedValue(`st${n}_status`, "RECIPE", getMappedValue(`st${n}_recipe`, "STATUS", "NORMAL"))) : "NORMAL"}
        totalTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "TOTAL_TIME", "0.0")) : "0.0"}
        stepTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "STEP_TIME", "0.0")) : "0.0"}
        cycleTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "CYCLE_TIME", "0 : 0")) : "0 : 0"}
        totalCycleTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "TOTAL_CYCLE_TIME", "0 : 0")) : "0 : 0"}
        actualStep={getMappedValue ? String(getMappedValue(`st${n}_status`, "STEP", "0")) : "0"}
        pressure={getMappedValue ? String(getMappedValue(`st${n}_status`, "PRESSURE", "0.00")) : "0.00"}
        scale={1.0}
        onClick={() => handleEquipmentClick && handleEquipmentClick(`st${n}_status`)}
        style={getDeveloperStyle(`st${n}_status`)}
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
  const [localTags, setLocalTags] = useState(() => {
    if (!data) return {};
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
    return initial;
  });

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
  }, [data?.targetId]);

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
              <>
                <image
                  href={sterilizerStationImageUrl}
                  width="2650"
                  x="-355"
                  y="-40"
                />

                {/* DYNAMIC TOP DOORS (INLET DOORS FOR ST1..ST4) */}
                <g className="som-top-doors">
                  {[1, 2, 3, 4].map((n) => {
                    const doorConfig = TOP_DOORS_CONFIG[n - 1];
                    const cardId = `card_inlet_door_st${n}`;
                    const rawVal = getMappedValue ? getMappedValue(cardId, "MONITOR", "CLOSE") : "CLOSE";
                    const doorStatus = formatDoorStatus(rawVal);
                    const isOpen = doorStatus === "OPEN";

                    const imageSrc = isOpen ? topOpenPng : topClosePng;
                    const x = isOpen ? doorConfig.openX : doorConfig.closeX;
                    const y = isOpen ? doorConfig.openY : doorConfig.closeY;
                    const w = isOpen ? doorConfig.openW : doorConfig.closeW;
                    const h = isOpen ? doorConfig.openH : doorConfig.closeH;
                    const rot = isOpen
                      ? (doorConfig.openRotation ?? doorConfig.rotation ?? 0)
                      : (doorConfig.closeRotation ?? doorConfig.rotation ?? 0);

                    return (
                      <image
                        key={`top_door_st${n}`}
                        href={imageSrc}
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        preserveAspectRatio="none"
                        transform={rot ? `rotate(${rot}, ${x + w / 2}, ${y + h / 2})` : undefined}
                        style={{
                          cursor: configMode ? "pointer" : "default",
                          filter: configMode ? getDeveloperStyle ? getDeveloperStyle(cardId)?.filter : undefined : undefined,
                          transition: "all 0.3s ease",
                        }}
                        onClick={() => configMode && handleEquipmentClick && handleEquipmentClick(cardId)}
                      />
                    );
                  })}
                </g>

                {/* DYNAMIC BOTTOM DOORS (OUTLET DOORS FOR ST1..ST4) */}
                <g className="som-bot-doors">
                  {[1, 2, 3, 4].map((n) => {
                    const doorConfig = BOT_DOORS_CONFIG[n - 1];
                    const cardId = `card_outlet_door_st${n}`;
                    const rawVal = getMappedValue ? getMappedValue(cardId, "MONITOR", "CLOSE") : "CLOSE";
                    const doorStatus = formatDoorStatus(rawVal);
                    const isOpen = doorStatus === "OPEN";

                    const imageSrc = isOpen ? botOpenPng : botClosePng;
                    const x = isOpen ? doorConfig.openX : doorConfig.closeX;
                    const y = isOpen ? doorConfig.openY : doorConfig.closeY;
                    const w = isOpen ? doorConfig.openW : doorConfig.closeW;
                    const h = isOpen ? doorConfig.openH : doorConfig.closeH;
                    const rot = isOpen
                      ? (doorConfig.openRotation ?? doorConfig.rotation ?? 0)
                      : (doorConfig.closeRotation ?? doorConfig.rotation ?? 0);

                    return (
                      <image
                        key={`bot_door_st${n}`}
                        href={imageSrc}
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        preserveAspectRatio="none"
                        transform={rot ? `rotate(${rot}, ${x + w / 2}, ${y + h / 2})` : undefined}
                        style={{
                          cursor: configMode ? "pointer" : "default",
                          filter: configMode ? getDeveloperStyle ? getDeveloperStyle(cardId)?.filter : undefined : undefined,
                          transition: "all 0.3s ease",
                        }}
                        onClick={() => configMode && handleEquipmentClick && handleEquipmentClick(cardId)}
                      />
                    );
                  })}
                </g>
              </>
            ) : (
              <>
                <image
                  href={sterilizerLineImageUrl}
                  width="2650"
                  x="-200"
                  y="-30"
                  style={{ mixBlendMode: "multiply" }}
                />

                {/* DYNAMIC TOP DOOR (INLET DOOR) FOR LINE VIEW */}
                {(() => {
                  const lineNum =
                    activeTab === "line1"
                      ? 1
                      : activeTab === "line2"
                        ? 2
                        : activeTab === "line3"
                          ? 3
                          : activeTab === "line4"
                            ? 4
                            : 1;
                  const cardId = `card_inlet_door_st${lineNum}`;
                  const rawVal = getMappedValue ? getMappedValue(cardId, "MONITOR", "CLOSE") : "CLOSE";
                  const doorStatus = formatDoorStatus(rawVal);
                  const isOpen = doorStatus === "OPEN";

                  const imageSrc = isOpen ? topOpenPng : topClosePng;
                  const x = isOpen ? LINE_TOP_DOOR_CONFIG.openX : LINE_TOP_DOOR_CONFIG.closeX;
                  const y = isOpen ? LINE_TOP_DOOR_CONFIG.openY : LINE_TOP_DOOR_CONFIG.closeY;
                  const w = isOpen ? LINE_TOP_DOOR_CONFIG.openW : LINE_TOP_DOOR_CONFIG.closeW;
                  const h = isOpen ? LINE_TOP_DOOR_CONFIG.openH : LINE_TOP_DOOR_CONFIG.closeH;
                  const rot = isOpen
                    ? (LINE_TOP_DOOR_CONFIG.openRotation ?? LINE_TOP_DOOR_CONFIG.rotation ?? 0)
                    : (LINE_TOP_DOOR_CONFIG.closeRotation ?? LINE_TOP_DOOR_CONFIG.rotation ?? 0);

                  return (
                    <image
                      key={`line_top_door_st${lineNum}`}
                      href={imageSrc}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      preserveAspectRatio="none"
                      transform={rot ? `rotate(${rot}, ${x + w / 2}, ${y + h / 2})` : undefined}
                      style={{
                        cursor: configMode ? "pointer" : "default",
                        filter: configMode ? getDeveloperStyle ? getDeveloperStyle(cardId)?.filter : undefined : undefined,
                        transition: "all 0.3s ease",
                      }}
                      onClick={() => configMode && handleEquipmentClick && handleEquipmentClick(cardId)}
                    />
                  );
                })()}

                {/* DYNAMIC BOTTOM DOOR (OUTLET DOOR) FOR LINE VIEW */}
                {(() => {
                  const lineNum =
                    activeTab === "line1"
                      ? 1
                      : activeTab === "line2"
                        ? 2
                        : activeTab === "line3"
                          ? 3
                          : activeTab === "line4"
                            ? 4
                            : 1;
                  const cardId = `card_outlet_door_st${lineNum}`;
                  const rawVal = getMappedValue ? getMappedValue(cardId, "MONITOR", "CLOSE") : "CLOSE";
                  const doorStatus = formatDoorStatus(rawVal);
                  const isOpen = doorStatus === "OPEN";

                  const imageSrc = isOpen ? botOpenPng : botClosePng;
                  const x = isOpen ? LINE_BOT_DOOR_CONFIG.openX : LINE_BOT_DOOR_CONFIG.closeX;
                  const y = isOpen ? LINE_BOT_DOOR_CONFIG.openY : LINE_BOT_DOOR_CONFIG.closeY;
                  const w = isOpen ? LINE_BOT_DOOR_CONFIG.openW : LINE_BOT_DOOR_CONFIG.closeW;
                  const h = isOpen ? LINE_BOT_DOOR_CONFIG.openH : LINE_BOT_DOOR_CONFIG.closeH;
                  const rot = isOpen
                    ? (LINE_BOT_DOOR_CONFIG.openRotation ?? LINE_BOT_DOOR_CONFIG.rotation ?? 0)
                    : (LINE_BOT_DOOR_CONFIG.closeRotation ?? LINE_BOT_DOOR_CONFIG.rotation ?? 0);

                  return (
                    <image
                      key={`line_bot_door_st${lineNum}`}
                      href={imageSrc}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      preserveAspectRatio="none"
                      transform={rot ? `rotate(${rot}, ${x + w / 2}, ${y + h / 2})` : undefined}
                      style={{
                        cursor: configMode ? "pointer" : "default",
                        filter: configMode ? getDeveloperStyle ? getDeveloperStyle(cardId)?.filter : undefined : undefined,
                        transition: "all 0.3s ease",
                      }}
                      onClick={() => configMode && handleEquipmentClick && handleEquipmentClick(cardId)}
                    />
                  );
                })()}
              </>
            )}

            {/* LAYER 2: PROCESS FLOWS (PIPES & FLOW ANIMATIONS) */}
            <g className="som-steam-flows">
              {activeTab === "overview" && (
                <>
                  {/* ========================================================================= */}
                  {/* [START] 0. MAIN STEAM HEADER PIPE (GLOBAL OVERVIEW PRESSURIZED HEADER)    */}
                  {/* ========================================================================= */}
                  <LiquidSteamFlowSVG
                    d="M -348,-26 L 2285,-26"
                    active={true}
                    mode="standby"
                    color="#38bdf8"
                    thickness={10}
                  />
                  {/* [STOP] 0. MAIN STEAM HEADER PIPE ======================================== */}

                  {/* ========================================================================= */}
                  {/* [START] 1. STERILIZER 1 (ST1 / TABUNG 1) PROCESS FLOWS                    */}
                  {/* ========================================================================= */}
                  <g id="overview_flows_st1">
                    {(() => {
                      const {
                        isInlet1Open,
                        isInlet2Open,
                        isInlet3Open,
                        isInlet4Open,
                        isFlashOpen,
                        isExhaustOpen,
                        isDCondOpen,
                        isCond1Open,
                        isReliefOpen,
                      } = resolveSterilizerValves(1, getMappedValue);

                      return (
                        <>
                          {/* INLET STEAM 1 ST1 */}
                          <g id="overview_flow_inlet_steam_1_st1">
                            {/* 1. Header ke Valve (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M -323,-15 L -323,23"
                              active={true}
                              mode={isInlet1Open ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Valve tembus ke pipa bawah (Hanya jalan saat valve hijau / isOpen > 0) */}
                            {isInlet1Open && (
                              <LiquidSteamFlowSVG
                                d="M -325,65 L -324,708"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* INLET STEAM 2 ST1 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_2_st1">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M -315,154 L -269,154"
                                active={true}
                                mode={isInlet2Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet2Open && (
                                <LiquidSteamFlowSVG
                                  d="M -223,155 L -156,155 Q -136,155 -136,175 L -137,195"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 3 ST1 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_3_st1">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M -310,375 L -267,375"
                                active={true}
                                mode={isInlet3Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet3Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M -219,375 L -179,375"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M -177,378 L -152,381 Q -132,384 -112,385 L -84,385 Q -64,386 -44,386 L 8,387 Q 28,387 48,386 L 63,386 Q 83,385 103,383 L 110,382 Q 125,381 139,377 L 153,372"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 4 ST1 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_4_st1">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M -311,635 L -267,636"
                                active={true}
                                mode={isInlet4Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet4Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M -224,636 L -184,636"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M -184,637 L -170,640 Q -157,642 -143,643 L -138,644 Q -119,645 -100,647 L -95,647 Q -75,649 -55,648 L -31,648 Q -11,647 9,647 L 29,647 Q 49,647 69,646 L 93,646 Q 110,645 127,641 L 143,637"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* FLASHING ST1 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_flashing_st1">
                              {/* Pipa Percabangan ke Valve Flashing */}
                              <LiquidSteamFlowSVG
                                d="M -312,713 L -284,712"
                                active={true}
                                mode={isFlashOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus ke pipa bawah */}
                              {isFlashOpen && (
                                <LiquidSteamFlowSVG
                                  d="M -251,712 L -235,713 Q -220,713 -219,728 L -218,754"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}

                          {/* EXHAUST STEAM ST1 */}
                          <g id="overview_flow_exhaust_steam_st1">
                            {/* 1. Pipa dari Tabung ke Valve Exhaust (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 94,196 L 96,133 Q 96,113 116,112 L 157,111"
                              active={true}
                              mode={isExhaustOpen ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Menuju Header Exhaust (Hanya jalan saat valve buka / isExhaustOpen > 0) */}
                            {isExhaustOpen && (
                              <LiquidSteamFlowSVG
                                d="M 204,112 L 225,112"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* D. CONDENSATE ST1 */}
                          <g id="overview_flow_d_cond_st1">
                            {/* 1. Pipa dari Tabung ke Valve D.Cond (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M -221,897 L -221,949 Q -221,969 -241,969 L -291,968"
                              active={true}
                              mode={isDCondOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve D.Cond (Hanya jalan saat valve buka / isDCondOpen > 0) */}
                            {isDCondOpen && (
                              <LiquidSteamFlowSVG
                                d="M -330,968 L -356,968"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* CONDENSATE 1 ST1 */}
                          <g id="overview_flow_condensate_1_st1">
                            {/* 1. Pipa dari Tabung Bawah ke Valve Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M -16,1050 L -17,1106 Q -17,1126 -37,1126 L -292,1126"
                              active={true}
                              mode={isCond1Open ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Condensate (Hanya jalan saat valve buka / isCond1Open > 0) */}
                            {isCond1Open && (
                              <LiquidSteamFlowSVG
                                d="M -332,1127 L -356,1127"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* RELIEF CONDENSATE ST1 */}
                          <g id="overview_flow_relief_condensate_st1">
                            {/* 1. Percabangan Pipa Menuju Valve Relief Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M -218,1115 L -218,1068 Q -218,1048 -238,1048 L -286,1048"
                              active={true}
                              mode={isReliefOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Relief Condensate (Hanya jalan saat valve buka / isReliefOpen > 0) */}
                            {isReliefOpen && (
                              <LiquidSteamFlowSVG
                                d="M -325,1047 L -355,1047"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>
                        </>
                      );
                    })()}
                  </g>
                  {/* [STOP] 1. STERILIZER 1 (ST1 / TABUNG 1) PROCESS FLOWS ==================== */}

                  {/* ========================================================================= */}
                  {/* [START] 2. STERILIZER 2 (ST2 / TABUNG 2) PROCESS FLOWS                    */}
                  {/* ========================================================================= */}
                  <g id="overview_flows_st2">
                    {(() => {
                      const {
                        isInlet1Open,
                        isInlet2Open,
                        isInlet3Open,
                        isInlet4Open,
                        isFlashOpen,
                        isExhaustOpen,
                        isDCondOpen,
                        isCond1Open,
                        isReliefOpen,
                      } = resolveSterilizerValves(2, getMappedValue);

                      return (
                        <>
                          {/* INLET STEAM 1 ST2 */}
                          <g id="overview_flow_inlet_steam_1_st2">
                            {/* 1. Header ke Valve (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 337,-17 L 337,23"
                              active={true}
                              mode={isInlet1Open ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Valve tembus ke pipa bawah vertikal (Hanya jalan saat valve hijau / isInlet1Open > 0) */}
                            {isInlet1Open && (
                              <LiquidSteamFlowSVG
                                d="M 336,66 L 337,704"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* INLET STEAM 2 ST2 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_2_st2">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 347,153 L 396,153"
                                active={true}
                                mode={isInlet2Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber Tabung 2 */}
                              {isInlet2Open && (
                                <LiquidSteamFlowSVG
                                  d="M 441,151 L 505,153 Q 525,153 525,173 L 524,196"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 3 ST2 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_3_st2">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 355,373 L 401,374"
                                active={true}
                                mode={isInlet3Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber Tabung 2 */}
                              {isInlet3Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M 437,373 L 481,373"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M 482,375 L 495,378 Q 507,381 520,382 L 524,383 Q 541,384 558,384 L 567,384 Q 587,384 607,384 L 624,384 Q 644,384 664,384 L 694,384 Q 714,384 734,383 L 751,383 Q 769,382 787,379 L 805,375"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 4 ST2 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_4_st2">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 352,635 L 390,635"
                                active={true}
                                mode={isInlet4Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber Tabung 2 */}
                              {isInlet4Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M 441,635 L 478,634"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M 483,636 L 500,641 Q 517,645 535,645 L 546,645 Q 566,645 586,646 L 594,646 Q 614,647 634,647 L 643,647 Q 663,647 683,647 L 696,648 Q 716,648 736,646 L 738,645 Q 758,643 778,640 L 802,636"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* FLASHING ST2 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_flashing_st2">
                              {/* Pipa Percabangan ke Valve Flashing */}
                              <LiquidSteamFlowSVG
                                d="M 344,710 L 377,710"
                                active={true}
                                mode={isFlashOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus ke pipa bawah */}
                              {isFlashOpen && (
                                <LiquidSteamFlowSVG
                                  d="M 405,711 L 424,712 Q 442,712 442,731 L 442,759"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}

                          {/* EXHAUST STEAM ST2 */}
                          <g id="overview_flow_exhaust_steam_st2">
                            {/* 1. Pipa dari Tabung ke Valve Exhaust (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 757,195 L 757,132 Q 757,112 777,111 L 822,110"
                              active={true}
                              mode={isExhaustOpen ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Menuju Header Exhaust (Hanya jalan saat valve buka / isExhaustOpen > 0) */}
                            {isExhaustOpen && (
                              <LiquidSteamFlowSVG
                                d="M 864,110 L 893,110"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* D. CONDENSATE ST2 */}
                          <g id="overview_flow_d_cond_st2">
                            {/* 1. Pipa dari Tabung ke Valve D.Cond (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 440,898 L 438,949 Q 437,969 417,968 L 368,967"
                              active={true}
                              mode={isDCondOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve D.Cond (Hanya jalan saat valve buka / isDCondOpen > 0) */}
                            {isDCondOpen && (
                              <LiquidSteamFlowSVG
                                d="M 330,967 L 293,967"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* CONDENSATE 1 ST2 */}
                          <g id="overview_flow_condensate_1_st2">
                            {/* 1. Pipa dari Tabung ke Valve Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 646,1046 L 644,1106 Q 644,1126 624,1126 L 368,1126"
                              active={true}
                              mode={isCond1Open ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Condensate (Hanya jalan saat valve buka / isCond1Open > 0) */}
                            {isCond1Open && (
                              <LiquidSteamFlowSVG
                                d="M 329,1127 L 297,1127"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* RELIEF CONDENSATE ST2 */}
                          <g id="overview_flow_relief_condensate_st2">
                            {/* 1. Percabangan Pipa Menuju Valve Relief Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 444,1116 L 444,1065 Q 444,1045 424,1045 L 372,1046"
                              active={true}
                              mode={isReliefOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Relief Condensate (Hanya jalan saat valve buka / isReliefOpen > 0) */}
                            {isReliefOpen && (
                              <LiquidSteamFlowSVG
                                d="M 333,1045 L 292,1046"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>
                        </>
                      );
                    })()}
                  </g>
                  {/* [STOP] 2. STERILIZER 2 (ST2 / TABUNG 2) PROCESS FLOWS ==================== */}

                  {/* ========================================================================= */}
                  {/* [START] 3. STERILIZER 3 (ST3 / TABUNG 3) PROCESS FLOWS                    */}
                  {/* ========================================================================= */}
                  <g id="overview_flows_st3">
                    {(() => {
                      const {
                        isInlet1Open,
                        isInlet2Open,
                        isInlet3Open,
                        isInlet4Open,
                        isFlashOpen,
                        isExhaustOpen,
                        isDCondOpen,
                        isCond1Open,
                        isReliefOpen,
                      } = resolveSterilizerValves(3, getMappedValue);

                      return (
                        <>
                          {/* INLET STEAM 1 ST3 */}
                          <g id="overview_flow_inlet_steam_1_st3">
                            {/* 1. Header ke Valve (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1001,-21 L 1001,25"
                              active={true}
                              mode={isInlet1Open ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Valve tembus ke pipa bawah (Hanya jalan saat valve hijau / isOpen > 0) */}
                            {isInlet1Open && (
                              <LiquidSteamFlowSVG
                                d="M 1002,61 L 1001,710"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* INLET STEAM 2 ST3 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_2_st3">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 1014,153 L 1062,153"
                                active={true}
                                mode={isInlet2Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet2Open && (
                                <LiquidSteamFlowSVG
                                  d="M 1103,153 L 1168,151 Q 1188,151 1188,171 L 1187,196"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 3 ST3 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_3_st3">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 1014,373 L 1060,374"
                                active={true}
                                mode={isInlet3Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet3Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M 1104,373 L 1146,374"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M 1142,374 L 1158,378 Q 1174,381 1190,383 L 1194,383 Q 1213,385 1233,385 L 1302,384 Q 1322,384 1342,385 L 1365,385 Q 1385,386 1405,383 L 1469,375"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 4 ST3 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_4_st3">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 1009,634 L 1057,634"
                                active={true}
                                mode={isInlet4Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet4Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M 1100,633 L 1144,633"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M 1146,635 L 1162,640 Q 1177,644 1193,645 L 1209,645 Q 1229,646 1249,646 L 1275,647 Q 1295,647 1315,647 L 1347,646 Q 1367,646 1387,646 L 1412,645 Q 1426,645 1440,644 L 1441,644 Q 1453,643 1464,638 L 1474,633"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* FLASHING ST3 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_flashing_st3">
                              {/* Pipa Percabangan ke Valve Flashing */}
                              <LiquidSteamFlowSVG
                                d="M 1005,709 L 1041,711"
                                active={true}
                                mode={isFlashOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus ke pipa bawah */}
                              {isFlashOpen && (
                                <LiquidSteamFlowSVG
                                  d="M 1073,711 L 1089,712 Q 1105,712 1106,728 L 1107,755"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}
                          {/* EXHAUST STEAM ST3 */}
                          <g id="overview_flow_exhaust_steam_st3">
                            {/* 1. Pipa dari Tabung ke Valve Exhaust (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1420,197 L 1418,132 Q 1418,112 1438,111 L 1483,110"
                              active={true}
                              mode={isExhaustOpen ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Menuju Header Exhaust (Hanya jalan saat valve buka / isExhaustOpen > 0) */}
                            {isExhaustOpen && (
                              <LiquidSteamFlowSVG
                                d="M 1523,110 L 1575,109"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>
                          {/* CONDENSATE 1 ST3 */}
                          <g id="overview_flow_condensate_1_st3">
                            {/* 1. Pipa dari Tabung ke Valve Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1310,1047 L 1309,1107 Q 1309,1127 1289,1127 L 1039,1127"
                              active={true}
                              mode={isCond1Open ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Condensate (Hanya jalan saat valve buka / isCond1Open > 0) */}
                            {isCond1Open && (
                              <LiquidSteamFlowSVG
                                d="M 994,1126 L 947,1126"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* RELIEF CONDENSATE ST3 */}
                          <g id="overview_flow_relief_condensate_st3">
                            {/* 1. Percabangan Pipa Menuju Valve Relief Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1108,1109 L 1109,1066 Q 1109,1046 1089,1046 L 1038,1046"
                              active={true}
                              mode={isReliefOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Relief Condensate (Hanya jalan saat valve buka / isReliefOpen > 0) */}
                            {isReliefOpen && (
                              <LiquidSteamFlowSVG
                                d="M 991,1047 L 954,1047"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>
                          {/* D. CONDENSATE ST3 */}
                          <g id="overview_flow_d_cond_st3">
                            {/* 1. Pipa dari Tabung ke Valve D.Cond (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1104,889 L 1106,947 Q 1107,967 1087,968 L 1034,969"
                              active={true}
                              mode={isDCondOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve D.Cond (Hanya jalan saat valve buka / isDCondOpen > 0) */}
                            {isDCondOpen && (
                              <LiquidSteamFlowSVG
                                d="M 994,968 L 949,968"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>
                        </>
                      );
                    })()}
                  </g>
                  {/* [STOP] 3. STERILIZER 3 (ST3 / TABUNG 3) PROCESS FLOWS ==================== */}

                  {/* ========================================================================= */}
                  {/* [START] 4. STERILIZER 4 (ST4 / TABUNG 4) PROCESS FLOWS                    */}
                  {/* ========================================================================= */}
                  <g id="overview_flows_st4">
                    {(() => {
                      const {
                        isInlet1Open,
                        isInlet2Open,
                        isInlet3Open,
                        isInlet4Open,
                        isFlashOpen,
                        isExhaustOpen,
                        isDCondOpen,
                        isCond1Open,
                        isReliefOpen,
                      } = resolveSterilizerValves(4, getMappedValue);

                      return (
                        <>
                          {/* INLET STEAM 1 ST4 */}
                          <g id="overview_flow_inlet_steam_1_st4">
                            {/* 1. Header ke Valve (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1662,-23 L 1662,19"
                              active={true}
                              mode={isInlet1Open ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Valve tembus ke pipa bawah (Hanya jalan saat valve hijau / isOpen > 0) */}
                            {isInlet1Open && (
                              <LiquidSteamFlowSVG
                                d="M 1662,61 L 1665,704"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* INLET STEAM 2 ST4 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_2_st4">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 1677,152 L 1715,152"
                                active={true}
                                mode={isInlet2Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet2Open && (
                                <LiquidSteamFlowSVG
                                  d="M 1767,152 L 1829,152 Q 1849,152 1850,172 L 1851,195"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 3 ST4 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_3_st4">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 1673,373 L 1718,373"
                                active={true}
                                mode={isInlet3Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet3Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M 1761,372 L 1810,373"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M 1807,372 L 1826,376 Q 1844,380 1863,381 L 1885,381 Q 1905,382 1925,383 L 1953,383 Q 1973,384 1993,383 L 2014,383 Q 2034,382 2054,382 L 2060,382 Q 2080,382 2100,379 L 2131,373"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* INLET STEAM 4 ST4 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_inlet_steam_4_st4">
                              {/* Pipa Percabangan ke Valve */}
                              <LiquidSteamFlowSVG
                                d="M 1669,632 L 1716,633"
                                active={true}
                                mode={isInlet4Open ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus masuk ke Chamber */}
                              {isInlet4Open && (
                                <>
                                  <LiquidSteamFlowSVG
                                    d="M 1765,633 L 1809,633"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                  <LiquidSteamFlowSVG
                                    d="M 1805,633 L 1819,638 Q 1833,642 1848,643 L 1864,643 Q 1884,644 1904,645 L 1939,645 Q 1959,646 1979,646 L 1990,645 Q 2010,645 2030,644 L 2042,643 Q 2062,642 2082,640 L 2131,636"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                </>
                              )}
                            </g>
                          )}

                          {/* FLASHING ST4 (HANYA ADA STEAM JIKA INLET 1 BUKA) */}
                          {isInlet1Open && (
                            <g id="overview_flow_flashing_st4">
                              {/* Pipa Percabangan ke Valve Flashing */}
                              <LiquidSteamFlowSVG
                                d="M 1670,710 L 1696,711"
                                active={true}
                                mode={isFlashOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={10}
                              />
                              {/* Valve tembus ke pipa bawah */}
                              {isFlashOpen && (
                                <LiquidSteamFlowSVG
                                  d="M 1735,710 L 1751,711 Q 1766,711 1767,726 L 1768,755"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={10}
                                />
                              )}
                            </g>
                          )}

                          {/* EXHAUST STEAM ST4 */}
                          <g id="overview_flow_exhaust_steam_st4">
                            {/* 1. Pipa dari Tabung ke Valve Exhaust (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 2082,190 L 2082,129 Q 2082,109 2102,110 L 2141,111"
                              active={true}
                              mode={isExhaustOpen ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Menuju Header Exhaust (Hanya jalan saat valve buka / isExhaustOpen > 0) */}
                            {isExhaustOpen && (
                              <LiquidSteamFlowSVG
                                d="M 2196,108 L 2240,108"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* CONDENSATE 1 ST4 */}
                          <g id="overview_flow_condensate_1_st4">
                            {/* 1. Pipa dari Tabung ke Valve Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1971,1047 L 1972,1105 Q 1973,1125 1953,1125 L 1696,1127"
                              active={true}
                              mode={isCond1Open ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Condensate (Hanya jalan saat valve buka / isCond1Open > 0) */}
                            {isCond1Open && (
                              <LiquidSteamFlowSVG
                                d="M 1654,1126 L 1614,1126"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>
                          {/* RELIEF CONDENSATE ST4 */}
                          <g id="overview_flow_relief_condensate_st4">
                            {/* 1. Percabangan Pipa Menuju Valve Relief Condensate (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1768,1110 L 1769,1065 Q 1770,1045 1750,1045 L 1697,1045"
                              active={true}
                              mode={isReliefOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve Relief Condensate (Hanya jalan saat valve buka / isReliefOpen > 0) */}
                            {isReliefOpen && (
                              <LiquidSteamFlowSVG
                                d="M 1657,1045 L 1619,1046"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>

                          {/* D. CONDENSATE ST4 */}
                          <g id="overview_flow_d_cond_st4">
                            {/* 1. Pipa dari Tabung ke Valve D.Cond (Standby saat tutup/merah, Flowing saat buka/hijau) */}
                            <LiquidSteamFlowSVG
                              d="M 1765,891 L 1766,944 Q 1766,964 1746,965 L 1692,966"
                              active={true}
                              mode={isDCondOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {/* 2. Pipa Setelah Valve D.Cond (Hanya jalan saat valve buka / isDCondOpen > 0) */}
                            {isDCondOpen && (
                              <LiquidSteamFlowSVG
                                d="M 1659,965 L 1616,965"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </g>
                        </>
                      );
                    })()}
                  </g>
                  {/* [STOP] 4. STERILIZER 4 (ST4 / TABUNG 4) PROCESS FLOWS ==================== */}
                </>
              )}
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
                    {/* Flow Line Indicators */}
                    <g className="som-line-flows">
                      {(() => {
                        const {
                          isInlet1Open,
                          isInlet2Open,
                          isInlet3Open,
                          isInlet4Open,
                          isFlashOpen,
                          isExhaustOpen,
                          isDCondOpen,
                          isCond1Open,
                          isReliefOpen,
                        } = resolveSterilizerValves(lineNum, getMappedValue);

                        return (
                          <>
                            {/* TOP MAIN STEAM HEADER */}
                            <LiquidSteamFlowSVG
                              d="M -199,-19 L 2444,-19"
                              active={true}
                              mode="standby"
                              color="#38bdf8"
                              thickness={10}
                            />

                            {/* INLET STEAM 1 (MASTER) */}
                            <LiquidSteamFlowSVG
                              d="M 459,-4 L 460,65"
                              active={true}
                              mode={isInlet1Open ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {isInlet1Open && (
                              <LiquidSteamFlowSVG
                                d="M 458,104 L 458,721"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}

                            {/* INLET STEAM 2 */}
                            {isInlet1Open && (
                              <>
                                <LiquidSteamFlowSVG
                                  d="M 466,163 L 528,163"
                                  active={true}
                                  mode={isInlet2Open ? "flowing" : "standby"}
                                  color="#38bdf8"
                                  thickness={10}
                                />
                                {isInlet2Open && (
                                  <LiquidSteamFlowSVG
                                    d="M 570,164 L 626,163 Q 646,163 646,183 L 647,208"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                )}
                              </>
                            )}

                            {/* INLET STEAM 3 */}
                            {isInlet1Open && (
                              <>
                                <LiquidSteamFlowSVG
                                  d="M 467,384 L 530,384"
                                  active={true}
                                  mode={isInlet3Open ? "flowing" : "standby"}
                                  color="#38bdf8"
                                  thickness={10}
                                />
                                {isInlet3Open && (
                                  <LiquidSteamFlowSVG
                                    d="M 564,384 L 597,384 Q 605,384 613,388 L 613,388 Q 620,391 628,392 L 640,393 Q 659,395 679,395 L 684,395 Q 702,395 720,397 L 720,397 Q 737,398 755,397 L 768,397 Q 788,396 808,396 L 812,396 Q 832,396 852,394 L 866,393 Q 883,392 900,391 L 917,390"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                )}
                              </>
                            )}

                            {/* INLET STEAM 4 */}
                            {isInlet1Open && (
                              <>
                                <LiquidSteamFlowSVG
                                  d="M 463,645 L 530,645"
                                  active={true}
                                  mode={isInlet4Open ? "flowing" : "standby"}
                                  color="#38bdf8"
                                  thickness={10}
                                />
                                {isInlet4Open && (
                                  <LiquidSteamFlowSVG
                                    d="M 556,646 L 593,647 Q 603,647 612,651 L 612,651 Q 621,654 631,654 L 649,655 Q 666,656 683,657 L 683,657 Q 699,658 716,658 L 729,658 Q 749,658 769,658 L 795,658 Q 815,658 835,658 L 851,657 Q 871,657 891,655 L 902,654 Q 911,653 920,650 L 928,646"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                )}
                              </>
                            )}

                            {/* FLASHING */}
                            {isInlet1Open && (
                              <>
                                <LiquidSteamFlowSVG
                                  d="M 465,723 L 502,723"
                                  active={true}
                                  mode={isFlashOpen ? "flowing" : "standby"}
                                  color="#38bdf8"
                                  thickness={10}
                                />
                                {isFlashOpen && (
                                  <LiquidSteamFlowSVG
                                    d="M 525,722 L 544,722 Q 562,722 563,740 L 564,766"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={10}
                                  />
                                )}
                              </>
                            )}

                            {/* EXHAUST STEAM */}
                            <LiquidSteamFlowSVG
                              d="M 878,208 L 879,142 Q 879,122 899,122 L 920,122"
                              active={true}
                              mode={isExhaustOpen ? "flowing" : "standby"}
                              color="#38bdf8"
                              thickness={10}
                            />
                            {isExhaustOpen && (
                              <LiquidSteamFlowSVG
                                d="M 958,122 L 1044,122"
                                active={true}
                                mode="flowing"
                                color="#38bdf8"
                                thickness={10}
                              />
                            )}

                            {/* CONDENSATE 1 (BROWN) */}
                            <LiquidSteamFlowSVG
                              d="M 768,1058 L 766,1118 Q 766,1138 746,1138 L 500,1137"
                              active={true}
                              mode={isCond1Open ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {isCond1Open && (
                              <LiquidSteamFlowSVG
                                d="M 459,1137 L 368,1137"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}

                            {/* RELIEF CONDENSATE (BROWN) */}
                            <LiquidSteamFlowSVG
                              d="M 566,1126 L 566,1076 Q 566,1056 546,1057 L 498,1058"
                              active={true}
                              mode={isReliefOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {isReliefOpen && (
                              <LiquidSteamFlowSVG
                                d="M 451,1058 L 372,1058"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}

                            {/* D. CONDENSATE (BROWN) */}
                            <LiquidSteamFlowSVG
                              d="M 562,905 L 562,960 Q 562,980 542,980 L 495,979"
                              active={true}
                              mode={isDCondOpen ? "flowing" : "standby"}
                              color="#b45309"
                              thickness={10}
                            />
                            {isDCondOpen && (
                              <LiquidSteamFlowSVG
                                d="M 462,979 L 366,979"
                                active={true}
                                mode="flowing"
                                color="#b45309"
                                thickness={10}
                              />
                            )}
                          </>
                        );
                      })()}
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
                  const mapped = (() => {
                    const matchedCard = TAG_MONITOR_CARDS.find((c) => c.id === item.cardId);
                    const fallbackVal = matchedCard ? (matchedCard.defaultVal || "0") : "0";
                    const v = getMappedValue ? getMappedValue(item.cardId, "MONITOR", fallbackVal) : fallbackVal;
                    if (!isValValid(v)) {
                      return fallbackVal;
                    }
                    return v;
                  })();

                  const strVal = String(mapped).trim().toLowerCase();
                  const numVal = parseFloat(mapped);
                  const isOpen = !isNaN(numVal) ? numVal > 0 : (strVal === "open" || strVal === "true" || strVal === "1");

                  return (
                    <EquipmentIconSVG
                      key={item.id}
                      x={item.x}
                      y={item.y}
                      icon={item.icon}
                      size={item.size}
                      rotation={item.rotation}
                      isRunning={isOpen}
                      onClick={() => handleEquipmentClick && handleEquipmentClick(item.cardId || item.id)}
                      style={getDeveloperStyle(item.cardId || item.id)}
                    />
                  );
                })}

                {/* Overview Tag Monitor Cards */}
                {TAG_MONITOR_CARDS.map((card) => {
                  const defaultFallback = card.defaultVal || "no tag";
                  const rawMapped = getMappedValue ? getMappedValue(card.id, "MONITOR", defaultFallback) : defaultFallback;
                  const isNoTag = !isValValid(rawMapped);
                  let displayValue = isNoTag ? (defaultFallback !== "no tag" ? defaultFallback : "No Tag") : rawMapped;

                  // Formatting for Digital / Valve Actuators & Doors
                  if (!isNoTag) {
                    if (card.id.includes("door")) {
                      displayValue = formatDoorStatus(displayValue);
                    } else if (
                      card.id.includes("inlet_steam_1") ||
                      card.id.includes("flashing") ||
                      (card.unit === "" && (card.defaultVal === "OPEN" || card.defaultVal === "CLOSE"))
                    ) {
                      displayValue = formatValveStatus(displayValue);
                    }
                  }

                  const statusColor = (() => {
                    if (displayValue === "No Tag" || displayValue === "--" || !isValValid(displayValue)) {
                      return "grey";
                    }
                    const str = String(displayValue).trim().toLowerCase();
                    if (str === "open" || str === "true" || str === "1") return "green";
                    if (str === "close" || str === "false" || str === "0") return "red";
                    const num = parseFloat(displayValue);
                    if (!isNaN(num)) return num > 0 ? "green" : "red";
                    return card.status || "grey";
                  })();

                  return (
                    <TagMonitorCardSVG
                      key={card.id}
                      x={card.x}
                      y={card.y}
                      title={card.title}
                      value={displayValue}
                      unit={card.unit}
                      status={statusColor}
                      width={card.width}
                      valueColor={card.valueColor}
                      headerPadding={card.headerPadding}
                      bodyPadding={card.bodyPadding}
                      scale={card.scale}
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
                        mode={getMappedValue ? String(getMappedValue(`st${n}_status`, "MODE", "AUTO")) : "AUTO"}
                        recipe={getMappedValue ? String(getMappedValue(`st${n}_status`, "RECIPE", getMappedValue(`st${n}_recipe`, "STATUS", "NORMAL"))) : "NORMAL"}
                        totalTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "TOTAL_TIME", "0.0")) : "0.0"}
                        stepTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "STEP_TIME", "0.0")) : "0.0"}
                        cycleTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "CYCLE_TIME", "0 : 0")) : "0 : 0"}
                        totalCycleTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "TOTAL_CYCLE_TIME", "0 : 0")) : "0 : 0"}
                        actualStep={getMappedValue ? String(getMappedValue(`st${n}_status`, "STEP", "0")) : "0"}
                        pressure={getMappedValue ? String(getMappedValue(`st${n}_status`, "PRESSURE", "0.00")) : "0.00"}
                        scale={0.95}
                        onClick={() => handleEquipmentClick && handleEquipmentClick(`st${n}_status`)}
                        style={getDeveloperStyle(`st${n}_status`)}
                      />
                    </g>
                  );
                })}
              </>
            )}

            {/* WT FLOW BUILDER OVERLAY (Active across Overview and all Line views) */}
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
          </svg>
        </div>
      </div>
    </div>
  );
}
