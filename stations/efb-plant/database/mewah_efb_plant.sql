--
-- PostgreSQL database cluster dump
--

-- Started on 2026-09-26 09:48:11

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS;

--
-- User Configurations
--








--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.0
-- Dumped by pg_dump version 17.0

-- Started on 2026-09-26 09:48:11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Completed on 2026-09-26 09:48:12

--
-- PostgreSQL database dump complete
--

--
-- Database "mewah_kip_efb_plant" dump
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.0
-- Dumped by pg_dump version 17.0

-- Started on 2026-09-26 09:48:12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4974 (class 1262 OID 29901)
-- Name: mewah_kip_efb_plant; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE mewah_kip_efb_plant WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';


ALTER DATABASE mewah_kip_efb_plant OWNER TO postgres;

\connect mewah_kip_efb_plant

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 29902)
-- Name: logsheet_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logsheet_entries (
    id integer NOT NULL,
    shift character varying(255) NOT NULL,
    log_date date NOT NULL,
    operator_id integer NOT NULL,
    operator_name character varying(100) NOT NULL,
    data_json json NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.logsheet_entries OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 29909)
-- Name: logsheet_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logsheet_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logsheet_entries_id_seq OWNER TO postgres;

--
-- TOC entry 4975 (class 0 OID 0)
-- Dependencies: 216
-- Name: logsheet_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logsheet_entries_id_seq OWNED BY public.logsheet_entries.id;


--
-- TOC entry 217 (class 1259 OID 29910)
-- Name: plc_commands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plc_commands (
    id integer NOT NULL,
    tag_id integer NOT NULL,
    value character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone,
    error_message character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.plc_commands OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 29918)
-- Name: plc_commands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plc_commands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plc_commands_id_seq OWNER TO postgres;

--
-- TOC entry 4976 (class 0 OID 0)
-- Dependencies: 218
-- Name: plc_commands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plc_commands_id_seq OWNED BY public.plc_commands.id;


--
-- TOC entry 219 (class 1259 OID 29919)
-- Name: plc_desired_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plc_desired_state (
    tag_id integer NOT NULL,
    desired_value character varying(255) NOT NULL,
    is_synced smallint DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.plc_desired_state OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 29924)
-- Name: plc_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plc_devices (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    ip_address character varying(45) NOT NULL,
    rack smallint DEFAULT 0 NOT NULL,
    slot smallint DEFAULT 1 NOT NULL,
    status character varying(255) DEFAULT 'DISCONNECTED'::character varying,
    enabled smallint DEFAULT 1 NOT NULL,
    last_seen_at timestamp without time zone,
    protocol character varying(50) DEFAULT 'SNAP7'::character varying
);


ALTER TABLE public.plc_devices OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 29932)
-- Name: plc_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plc_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plc_devices_id_seq OWNER TO postgres;

--
-- TOC entry 4977 (class 0 OID 0)
-- Dependencies: 221
-- Name: plc_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plc_devices_id_seq OWNED BY public.plc_devices.id;


--
-- TOC entry 222 (class 1259 OID 29933)
-- Name: plc_tag_latest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plc_tag_latest (
    tag_id integer NOT NULL,
    value character varying(255) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.plc_tag_latest OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 29937)
-- Name: plc_tag_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plc_tag_values (
    tag_id integer NOT NULL,
    value character varying(255) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.plc_tag_values OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 29941)
-- Name: plc_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plc_tags (
    id integer NOT NULL,
    plc_id integer NOT NULL,
    db_number integer NOT NULL,
    byte_offset integer NOT NULL,
    bit_offset integer,
    data_type character varying(255) NOT NULL,
    tag_name character varying(150) NOT NULL,
    access character varying(255) DEFAULT 'READ'::character varying NOT NULL,
    enabled smallint DEFAULT 1 NOT NULL,
    node_id character varying(255) DEFAULT 'DB'::character varying
);


ALTER TABLE public.plc_tags OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 29949)
-- Name: plc_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plc_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plc_tags_id_seq OWNER TO postgres;

--
-- TOC entry 4978 (class 0 OID 0)
-- Dependencies: 225
-- Name: plc_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plc_tags_id_seq OWNED BY public.plc_tags.id;


--
-- TOC entry 226 (class 1259 OID 29950)
-- Name: station_event_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.station_event_logs (
    id bigint NOT NULL,
    tag_name character varying(150) NOT NULL,
    old_value character varying(255) DEFAULT NULL::character varying,
    new_value character varying(255) DEFAULT NULL::character varying,
    quality character varying(50) DEFAULT 'GOOD'::character varying,
    severity character varying(255) DEFAULT 'INFO'::character varying,
    source character varying(50) DEFAULT 'PLC'::character varying,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP(3),
    shift character varying(10) DEFAULT NULL::character varying
);


ALTER TABLE public.station_event_logs OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 29962)
-- Name: station_event_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.station_event_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.station_event_logs_id_seq OWNER TO postgres;

--
-- TOC entry 4979 (class 0 OID 0)
-- Dependencies: 227
-- Name: station_event_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.station_event_logs_id_seq OWNED BY public.station_event_logs.id;


--
-- TOC entry 232 (class 1259 OID 37796)
-- Name: station_parameters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.station_parameters (
    param_key character varying(100) NOT NULL,
    param_value text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.station_parameters OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 37786)
-- Name: station_tag_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.station_tag_mappings (
    id integer NOT NULL,
    station character varying(50) NOT NULL,
    equipment character varying(100) NOT NULL,
    signal_key character varying(50) NOT NULL,
    tag_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.station_tag_mappings OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 37785)
-- Name: station_tag_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.station_tag_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.station_tag_mappings_id_seq OWNER TO postgres;

--
-- TOC entry 4980 (class 0 OID 0)
-- Dependencies: 230
-- Name: station_tag_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.station_tag_mappings_id_seq OWNED BY public.station_tag_mappings.id;


--
-- TOC entry 228 (class 1259 OID 29963)
-- Name: threshold_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.threshold_settings (
    id integer NOT NULL,
    parameter_key character varying(100) NOT NULL,
    lower_val double precision DEFAULT 0,
    warning_val double precision DEFAULT 50,
    danger_val double precision DEFAULT 80,
    unit character varying(20) DEFAULT NULL::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.threshold_settings OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 29971)
-- Name: threshold_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.threshold_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.threshold_settings_id_seq OWNER TO postgres;

--
-- TOC entry 4981 (class 0 OID 0)
-- Dependencies: 229
-- Name: threshold_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.threshold_settings_id_seq OWNED BY public.threshold_settings.id;


--
-- TOC entry 4734 (class 2604 OID 29972)
-- Name: logsheet_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logsheet_entries ALTER COLUMN id SET DEFAULT nextval('public.logsheet_entries_id_seq'::regclass);


--
-- TOC entry 4737 (class 2604 OID 29973)
-- Name: plc_commands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_commands ALTER COLUMN id SET DEFAULT nextval('public.plc_commands_id_seq'::regclass);


--
-- TOC entry 4743 (class 2604 OID 29974)
-- Name: plc_devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_devices ALTER COLUMN id SET DEFAULT nextval('public.plc_devices_id_seq'::regclass);


--
-- TOC entry 4751 (class 2604 OID 29975)
-- Name: plc_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_tags ALTER COLUMN id SET DEFAULT nextval('public.plc_tags_id_seq'::regclass);


--
-- TOC entry 4755 (class 2604 OID 29976)
-- Name: station_event_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_event_logs ALTER COLUMN id SET DEFAULT nextval('public.station_event_logs_id_seq'::regclass);


--
-- TOC entry 4769 (class 2604 OID 37789)
-- Name: station_tag_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_tag_mappings ALTER COLUMN id SET DEFAULT nextval('public.station_tag_mappings_id_seq'::regclass);


--
-- TOC entry 4763 (class 2604 OID 29977)
-- Name: threshold_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_settings ALTER COLUMN id SET DEFAULT nextval('public.threshold_settings_id_seq'::regclass);


--
-- TOC entry 4951 (class 0 OID 29902)
-- Dependencies: 215
-- Data for Name: logsheet_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.logsheet_entries (id, shift, log_date, operator_id, operator_name, data_json, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4953 (class 0 OID 29910)
-- Dependencies: 217
-- Data for Name: plc_commands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plc_commands (id, tag_id, value, status, created_at, updated_at, error_message) FROM stdin;
\.


--
-- TOC entry 4955 (class 0 OID 29919)
-- Dependencies: 219
-- Data for Name: plc_desired_state; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plc_desired_state (tag_id, desired_value, is_synced, updated_at) FROM stdin;
\.


--
-- TOC entry 4956 (class 0 OID 29924)
-- Dependencies: 220
-- Data for Name: plc_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plc_devices (id, name, ip_address, rack, slot, status, enabled, last_seen_at, protocol) FROM stdin;
4	plc efb 	127.0.0.1	0	1	CONNECTED	1	2026-09-26 09:47:56.84137	SNAP7
\.


--
-- TOC entry 4958 (class 0 OID 29933)
-- Dependencies: 222
-- Data for Name: plc_tag_latest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plc_tag_latest (tag_id, value, updated_at) FROM stdin;
69	50	2026-09-26 09:15:43.956463
68	33	2026-09-26 09:48:12.384891
\.


--
-- TOC entry 4959 (class 0 OID 29937)
-- Dependencies: 223
-- Data for Name: plc_tag_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plc_tag_values (tag_id, value, "timestamp") FROM stdin;
68	39	2026-09-26 09:45:45.48737
68	40	2026-09-26 09:45:47.107907
68	43	2026-09-26 09:45:47.514456
68	44	2026-09-26 09:45:48.122892
68	41	2026-09-26 09:45:48.730818
68	43	2026-09-26 09:45:49.137443
68	42	2026-09-26 09:45:49.7452
68	45	2026-09-26 09:45:50.351133
68	44	2026-09-26 09:45:50.756325
68	42	2026-09-26 09:45:51.36176
68	44	2026-09-26 09:45:51.968041
68	42	2026-09-26 09:45:52.372268
68	43	2026-09-26 09:45:52.97819
68	41	2026-09-26 09:45:53.584097
68	40	2026-09-26 09:45:53.988622
68	41	2026-09-26 09:45:54.599023
68	42	2026-09-26 09:45:55.004323
68	44	2026-09-26 09:45:55.609949
68	46	2026-09-26 09:45:56.21763
68	48	2026-09-26 09:45:56.624485
68	47	2026-09-26 09:45:57.233708
68	44	2026-09-26 09:45:58.246535
68	45	2026-09-26 09:45:58.855515
68	47	2026-09-26 09:45:59.463973
68	45	2026-09-26 09:45:59.867331
68	42	2026-09-26 09:46:01.083716
68	43	2026-09-26 09:46:01.49102
68	42	2026-09-26 09:46:02.09806
68	44	2026-09-26 09:46:02.504422
68	46	2026-09-26 09:46:03.11468
68	45	2026-09-26 09:46:03.740697
68	44	2026-09-26 09:46:04.144228
68	45	2026-09-26 09:46:04.750144
68	46	2026-09-26 09:46:05.356574
68	49	2026-09-26 09:46:05.765439
68	50	2026-09-26 09:46:06.374848
68	49	2026-09-26 09:46:07.385497
68	50	2026-09-26 09:46:07.995493
68	49	2026-09-26 09:46:09.007635
68	47	2026-09-26 09:46:09.616807
68	45	2026-09-26 09:46:10.227838
68	44	2026-09-26 09:46:10.632986
68	45	2026-09-26 09:46:11.239044
68	43	2026-09-26 09:46:11.847086
68	42	2026-09-26 09:46:12.250808
68	43	2026-09-26 09:46:12.857714
68	44	2026-09-26 09:46:13.264418
68	43	2026-09-26 09:46:13.869951
68	41	2026-09-26 09:46:14.478578
68	39	2026-09-26 09:46:14.883903
68	37	2026-09-26 09:46:15.490627
68	39	2026-09-26 09:46:16.502357
68	40	2026-09-26 09:46:17.718533
68	41	2026-09-26 09:46:18.734425
68	38	2026-09-26 09:46:19.345651
68	36	2026-09-26 09:46:20.356688
68	34	2026-09-26 09:46:20.963545
68	32	2026-09-26 09:46:21.977233
68	31	2026-09-26 09:46:22.582542
68	34	2026-09-26 09:46:22.987534
68	33	2026-09-26 09:46:24.202108
68	30	2026-09-26 09:46:24.605762
68	32	2026-09-26 09:46:25.214305
68	34	2026-09-26 09:46:25.62247
68	36	2026-09-26 09:46:26.230005
68	34	2026-09-26 09:46:26.839374
68	33	2026-09-26 09:46:27.246675
68	32	2026-09-26 09:46:27.854104
68	34	2026-09-26 09:46:28.46188
68	31	2026-09-26 09:46:29.47316
68	30	2026-09-26 09:46:30.08101
68	28	2026-09-26 09:46:30.486363
68	26	2026-09-26 09:46:31.094927
68	27	2026-09-26 09:46:31.701005
68	26	2026-09-26 09:46:33.323436
68	27	2026-09-26 09:46:33.728857
68	29	2026-09-26 09:46:34.335954
68	27	2026-09-26 09:46:34.943354
68	29	2026-09-26 09:46:35.346332
68	30	2026-09-26 09:46:35.953477
68	31	2026-09-26 09:46:36.56168
68	32	2026-09-26 09:46:36.966962
68	29	2026-09-26 09:46:37.576311
68	30	2026-09-26 09:46:38.183066
68	32	2026-09-26 09:46:38.587454
68	34	2026-09-26 09:46:39.193575
68	31	2026-09-26 09:46:39.801194
68	34	2026-09-26 09:46:40.207756
68	37	2026-09-26 09:46:41.423478
68	36	2026-09-26 09:46:41.829247
68	38	2026-09-26 09:46:42.435697
68	35	2026-09-26 09:46:43.042308
68	34	2026-09-26 09:46:43.44604
68	32	2026-09-26 09:46:44.053286
68	33	2026-09-26 09:46:45.127011
68	34	2026-09-26 09:46:45.771237
68	37	2026-09-26 09:46:46.180957
68	38	2026-09-26 09:46:46.839378
68	37	2026-09-26 09:46:47.26038
68	39	2026-09-26 09:46:47.920697
68	37	2026-09-26 09:46:48.344774
68	39	2026-09-26 09:46:48.98401
68	37	2026-09-26 09:46:49.416775
68	38	2026-09-26 09:46:50.510555
68	37	2026-09-26 09:46:51.133569
68	40	2026-09-26 09:46:52.213036
68	39	2026-09-26 09:46:52.839776
68	36	2026-09-26 09:46:53.263348
68	37	2026-09-26 09:46:53.916695
68	35	2026-09-26 09:46:54.357177
68	37	2026-09-26 09:46:54.985999
68	35	2026-09-26 09:46:56.050248
68	36	2026-09-26 09:46:56.695028
68	33	2026-09-26 09:46:57.11779
68	36	2026-09-26 09:46:57.7594
68	35	2026-09-26 09:46:58.844573
68	32	2026-09-26 09:46:59.287599
68	34	2026-09-26 09:46:59.946784
68	36	2026-09-26 09:47:00.35563
68	35	2026-09-26 09:47:01.001806
68	33	2026-09-26 09:47:02.09784
68	34	2026-09-26 09:47:02.531881
68	35	2026-09-26 09:47:04.318626
68	36	2026-09-26 09:47:05.389989
68	38	2026-09-26 09:47:05.825976
68	39	2026-09-26 09:47:06.466798
68	36	2026-09-26 09:47:07.109214
68	34	2026-09-26 09:47:07.548277
68	37	2026-09-26 09:47:08.175075
68	35	2026-09-26 09:47:08.598342
68	38	2026-09-26 09:47:10.338828
68	41	2026-09-26 09:47:10.761979
68	42	2026-09-26 09:47:11.403538
68	43	2026-09-26 09:47:11.839668
68	40	2026-09-26 09:47:12.481546
68	41	2026-09-26 09:47:13.134489
68	43	2026-09-26 09:47:13.574132
68	45	2026-09-26 09:47:14.202067
68	44	2026-09-26 09:47:14.620723
68	41	2026-09-26 09:47:15.257692
68	39	2026-09-26 09:47:15.684246
68	41	2026-09-26 09:47:16.341842
68	39	2026-09-26 09:47:16.76636
68	40	2026-09-26 09:47:17.404215
68	38	2026-09-26 09:47:18.045081
68	35	2026-09-26 09:47:18.481688
68	36	2026-09-26 09:47:19.136711
68	38	2026-09-26 09:47:19.558061
68	37	2026-09-26 09:47:20.218394
68	35	2026-09-26 09:47:20.66014
68	33	2026-09-26 09:47:21.315244
68	31	2026-09-26 09:47:21.749165
68	33	2026-09-26 09:47:22.416475
68	34	2026-09-26 09:47:22.986654
68	31	2026-09-26 09:47:24.087029
68	33	2026-09-26 09:47:24.523935
68	35	2026-09-26 09:47:25.15278
68	37	2026-09-26 09:47:25.579966
68	34	2026-09-26 09:47:26.232903
68	33	2026-09-26 09:47:26.672108
68	35	2026-09-26 09:47:27.355472
68	33	2026-09-26 09:47:27.820193
68	31	2026-09-26 09:47:28.477572
68	29	2026-09-26 09:47:28.902124
68	31	2026-09-26 09:47:29.558297
68	29	2026-09-26 09:47:29.979727
68	31	2026-09-26 09:47:30.633202
68	33	2026-09-26 09:47:31.715812
68	32	2026-09-26 09:47:32.136952
68	30	2026-09-26 09:47:32.921657
68	31	2026-09-26 09:47:33.364364
68	28	2026-09-26 09:47:34.027681
68	31	2026-09-26 09:47:34.462908
68	33	2026-09-26 09:47:35.104145
68	32	2026-09-26 09:47:35.524837
68	33	2026-09-26 09:47:36.618036
68	30	2026-09-26 09:47:37.274008
68	32	2026-09-26 09:47:37.682154
68	34	2026-09-26 09:47:38.32341
68	36	2026-09-26 09:47:38.9593
68	35	2026-09-26 09:47:39.399701
68	32	2026-09-26 09:47:40.056061
68	31	2026-09-26 09:47:40.47745
68	32	2026-09-26 09:47:41.117231
68	31	2026-09-26 09:47:43.289644
68	33	2026-09-26 09:47:44.343811
68	36	2026-09-26 09:47:45.452228
68	37	2026-09-26 09:47:45.892427
68	35	2026-09-26 09:47:46.532734
68	32	2026-09-26 09:47:47.186447
68	34	2026-09-26 09:47:47.62175
68	35	2026-09-26 09:47:48.276727
68	36	2026-09-26 09:47:48.715607
68	38	2026-09-26 09:47:49.341779
68	40	2026-09-26 09:47:49.777912
68	39	2026-09-26 09:47:50.436211
68	40	2026-09-26 09:47:50.855376
68	43	2026-09-26 09:47:51.510226
68	42	2026-09-26 09:47:51.933699
68	41	2026-09-26 09:47:52.587445
68	39	2026-09-26 09:47:53.027408
68	36	2026-09-26 09:47:54.094048
68	37	2026-09-26 09:47:54.737734
68	35	2026-09-26 09:47:55.393495
68	37	2026-09-26 09:47:55.803571
68	38	2026-09-26 09:47:56.415676
68	39	2026-09-26 09:47:56.841285
68	38	2026-09-26 09:47:57.470327
68	36	2026-09-26 09:47:58.117406
68	39	2026-09-26 09:47:58.543509
68	37	2026-09-26 09:47:59.200104
68	36	2026-09-26 09:47:59.617158
68	34	2026-09-26 09:48:00.27301
68	31	2026-09-26 09:48:00.710643
68	33	2026-09-26 09:48:01.361441
68	31	2026-09-26 09:48:01.791366
68	30	2026-09-26 09:48:02.443058
68	28	2026-09-26 09:48:02.882716
68	27	2026-09-26 09:48:03.52743
68	25	2026-09-26 09:48:03.949025
68	26	2026-09-26 09:48:04.577405
68	23	2026-09-26 09:48:05.226218
68	21	2026-09-26 09:48:05.650317
68	20	2026-09-26 09:48:06.30652
68	22	2026-09-26 09:48:08.446295
68	24	2026-09-26 09:48:09.101438
68	26	2026-09-26 09:48:09.526751
68	29	2026-09-26 09:48:10.166008
68	30	2026-09-26 09:48:11.233628
68	33	2026-09-26 09:48:12.384385
\.


--
-- TOC entry 4960 (class 0 OID 29941)
-- Dependencies: 224
-- Data for Name: plc_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plc_tags (id, plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id) FROM stdin;
68	4	1	10	\N	INT	test_tag_overview	READ	1	DB
69	4	1	100	\N	INT	test_tag_setting	WRITE	1	DB
\.


--
-- TOC entry 4962 (class 0 OID 29950)
-- Dependencies: 226
-- Data for Name: station_event_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.station_event_logs (id, tag_name, old_value, new_value, quality, severity, source, "timestamp", shift) FROM stdin;
\.


--
-- TOC entry 4968 (class 0 OID 37796)
-- Dependencies: 232
-- Data for Name: station_parameters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.station_parameters (param_key, param_value, updated_at) FROM stdin;
calib1	{"amp1":{"label":"Amp 1","maxSensor":20,"maxUnit":"A","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"A"},"amp2":{"label":"Amp 2","maxSensor":0,"maxUnit":"A","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"A"},"amp3":{"label":"Amp 3","maxSensor":0,"maxUnit":"A","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"A"},"amp4":{"label":"Amp 4","maxSensor":0,"maxUnit":"A","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"A"}}	2026-09-24 11:42:10.616931
calib2	{"temp1":{"label":"Temp 1","maxSensor":0,"maxUnit":"°C","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"°C"},"temp2":{"label":"Temp 2","maxSensor":0,"maxUnit":"°C","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"°C"},"temp3":{"label":"Temp 3","maxSensor":0,"maxUnit":"°C","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"°C"},"temp4":{"label":"Temp 4","maxSensor":0,"maxUnit":"°C","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"°C"},"oilFlow":{"label":"Oil Flow","maxSensor":0,"maxUnit":"M³/h","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"T/h"},"waterFlow1":{"label":"Water Flow","maxSensor":0,"maxUnit":"M³/h","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"T/h"},"waterFlow2":{"label":"Water Flow","maxSensor":0,"maxUnit":"M³/h","calibrationValue":0,"rawValue":0,"outValue":0,"outUnit":"T/h"}}	2026-09-24 11:42:10.61864
steamPid	{"1":{"efb1":{"sp":12,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0},"efb2":{"sp":0,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0},"efb3":{"sp":0,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0},"efb4":{"sp":0,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0}}}	2026-09-24 11:46:37.341951
dilutionPid	{"1":{"efb1":{"sp":0,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0},"efb2":{"sp":0,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0},"efb3":{"sp":0,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0},"efb4":{"sp":0,"p":0,"i":0,"d":0,"min":0,"max":0,"startValue":0}}}	2026-09-24 11:46:37.344071
minMaxAmpLoad	{"1":{"efb1":{"ampMin":0,"ampMax":0,"loadMin":0,"loadMax":0},"efb2":{"ampMin":0,"ampMax":0,"loadMin":0,"loadMax":0},"efb3":{"ampMin":0,"ampMax":0,"loadMin":0,"loadMax":0},"efb4":{"ampMin":0,"ampMax":0,"loadMin":0,"loadMax":0}}}	2026-09-24 11:46:37.344599
\.


--
-- TOC entry 4967 (class 0 OID 37786)
-- Dependencies: 231
-- Data for Name: station_tag_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.station_tag_mappings (id, station, equipment, signal_key, tag_id, created_at, updated_at) FROM stdin;
634	EFB-PLANT	valve_press_2_dilution	DILUTION	68	2026-09-25 14:23:30.002926	2026-09-25 14:23:30.016071
636	EFB-PLANT	valve_press_2_dilution	STATUS	68	2026-09-25 14:23:30.016638	2026-09-25 14:23:30.016638
637	EFB-PLANT	valve_press_2_dilution	MONITOR	68	2026-09-25 14:23:30.017058	2026-09-25 14:23:30.017058
638	EFB-PLANT	valve_press_2_dilution_single	DILUTION	68	2026-09-25 14:23:30.0174	2026-09-25 14:23:30.0174
639	EFB-PLANT	valve_press_2_dilution_single	STATUS	68	2026-09-25 14:23:30.017767	2026-09-25 14:23:30.017767
640	EFB-PLANT	card_valve_press_2_dilution	DILUTION	68	2026-09-25 14:23:30.018252	2026-09-25 14:23:30.018252
641	EFB-PLANT	card_valve_press_2_dilution	MONITOR	68	2026-09-25 14:23:30.018806	2026-09-25 14:23:30.018806
642	EFB-PLANT	efb2_card	V_DILUTION	68	2026-09-25 14:23:30.020248	2026-09-25 14:23:30.020248
643	EFB-PLANT	efb_no_2	V_DILUTION	68	2026-09-25 14:23:30.021189	2026-09-25 14:23:30.021189
644	EFB-PLANT	efb_no_2	DILUTION	68	2026-09-25 14:23:30.021936	2026-09-25 14:23:30.021936
26	EFB-PLANT	single_efb_1_value_sensor	WATER_FLOW	5	2026-09-21 22:11:15.367877	2026-09-21 22:11:15.368616
28	EFB-PLANT	water_flow	MONITOR	5	2026-09-21 22:11:15.369097	2026-09-21 22:11:15.369097
29	EFB-PLANT	single_efb_1_value_sensor	OIL_FLOW	6	2026-09-21 22:11:15.369558	2026-09-21 22:11:15.370139
31	EFB-PLANT	oil_flow	MONITOR	6	2026-09-21 22:11:15.370619	2026-09-21 22:11:15.370619
33	EFB-PLANT	efb_steam_pid_efb1_p	P	8	2026-09-22 09:24:54.58878	2026-09-22 09:24:54.58878
34	EFB-PLANT	efb_steam_pid_efb1_i	I	9	2026-09-22 09:24:59.872617	2026-09-22 09:24:59.872617
35	EFB-PLANT	efb_steam_pid_efb1_d	D	10	2026-09-22 09:25:09.945697	2026-09-22 09:25:09.945697
36	EFB-PLANT	efb_steam_pid_efb1_min	MIN	11	2026-09-22 09:25:15.156271	2026-09-22 09:25:15.156271
37	EFB-PLANT	efb_steam_pid_efb1_max	MAX	12	2026-09-22 09:25:20.17615	2026-09-22 09:25:20.17615
38	EFB-PLANT	efb_steam_pid_efb1_startValue	STARTVALUE	14	2026-09-22 09:25:25.135132	2026-09-22 09:25:25.135132
656	EFB-PLANT	valve_press_3_dilution	DILUTION	68	2026-09-25 14:23:38.660658	2026-09-25 14:23:38.662547
658	EFB-PLANT	valve_press_3_dilution	STATUS	68	2026-09-25 14:23:38.663541	2026-09-25 14:23:38.663541
112	EFB-PLANT	efb_steam_pid_efb2_sp	SP	24	2026-09-22 21:08:08.147964	2026-09-22 21:08:08.147964
113	EFB-PLANT	efb_steam_pid_efb3_sp	SP	29	2026-09-22 21:08:13.811647	2026-09-22 21:08:13.811647
114	EFB-PLANT	efb_steam_pid_efb4_sp	SP	34	2026-09-22 21:08:21.743848	2026-09-22 21:08:21.743848
115	EFB-PLANT	efb_dilution_pid_efb1_sp	SP	21	2026-09-22 21:08:39.033153	2026-09-22 21:08:39.033153
116	EFB-PLANT	efb_dilution_pid_efb2_sp	SP	26	2026-09-22 21:08:48.981481	2026-09-22 21:08:48.981481
117	EFB-PLANT	efb_dilution_pid_efb3_sp	SP	31	2026-09-22 21:08:56.446069	2026-09-22 21:08:56.446069
118	EFB-PLANT	efb_dilution_pid_efb4_sp	SP	36	2026-09-22 21:09:03.573331	2026-09-22 21:09:03.573331
659	EFB-PLANT	valve_press_3_dilution	MONITOR	68	2026-09-25 14:23:38.664257	2026-09-25 14:23:38.664257
660	EFB-PLANT	valve_press_3_dilution_single	DILUTION	68	2026-09-25 14:23:38.665159	2026-09-25 14:23:38.665159
661	EFB-PLANT	valve_press_3_dilution_single	STATUS	68	2026-09-25 14:23:38.665863	2026-09-25 14:23:38.665863
662	EFB-PLANT	card_valve_press_3_dilution	DILUTION	68	2026-09-25 14:23:38.666594	2026-09-25 14:23:38.666594
663	EFB-PLANT	card_valve_press_3_dilution	MONITOR	68	2026-09-25 14:23:38.667293	2026-09-25 14:23:38.667293
664	EFB-PLANT	efb3_card	V_DILUTION	68	2026-09-25 14:23:38.667847	2026-09-25 14:23:38.667847
665	EFB-PLANT	efb_no_3	V_DILUTION	68	2026-09-25 14:23:38.668591	2026-09-25 14:23:38.668591
666	EFB-PLANT	efb_no_3	DILUTION	68	2026-09-25 14:23:38.669522	2026-09-25 14:23:38.669522
667	EFB-PLANT	valve_press_3_steam	STEAM	69	2026-09-25 14:23:42.943578	2026-09-25 14:23:42.945357
669	EFB-PLANT	valve_press_3_steam	STATUS	69	2026-09-25 14:23:42.945806	2026-09-25 14:23:42.945806
670	EFB-PLANT	valve_press_3_steam	MONITOR	69	2026-09-25 14:23:42.946192	2026-09-25 14:23:42.946192
671	EFB-PLANT	valve_press_3_steam_single	STEAM	69	2026-09-25 14:23:42.946573	2026-09-25 14:23:42.946573
672	EFB-PLANT	valve_press_3_steam_single	STATUS	69	2026-09-25 14:23:42.94698	2026-09-25 14:23:42.94698
673	EFB-PLANT	card_valve_press_3_steam	STEAM	69	2026-09-25 14:23:42.947495	2026-09-25 14:23:42.947495
674	EFB-PLANT	card_valve_press_3_steam	MONITOR	69	2026-09-25 14:23:42.94786	2026-09-25 14:23:42.94786
675	EFB-PLANT	efb3_card	V_STEAM	69	2026-09-25 14:23:42.948231	2026-09-25 14:23:42.948231
676	EFB-PLANT	efb_no_3	V_STEAM	69	2026-09-25 14:23:42.948665	2026-09-25 14:23:42.948665
677	EFB-PLANT	efb_no_3	STEAM	69	2026-09-25 14:23:42.949163	2026-09-25 14:23:42.949163
689	EFB-PLANT	valve_press_4_steam	STEAM	69	2026-09-25 14:23:51.474566	2026-09-25 14:23:51.476358
691	EFB-PLANT	valve_press_4_steam	STATUS	69	2026-09-25 14:23:51.477014	2026-09-25 14:23:51.477014
32	EFB-PLANT	efb_steam_pid_efb1_sp	SP	39	2026-09-22 09:24:49.352163	2026-09-24 11:46:17.283734
692	EFB-PLANT	valve_press_4_steam	MONITOR	69	2026-09-25 14:23:51.477465	2026-09-25 14:23:51.477465
693	EFB-PLANT	valve_press_4_steam_single	STEAM	69	2026-09-25 14:23:51.477834	2026-09-25 14:23:51.477834
694	EFB-PLANT	valve_press_4_steam_single	STATUS	69	2026-09-25 14:23:51.478097	2026-09-25 14:23:51.478097
695	EFB-PLANT	card_valve_press_4_steam	STEAM	69	2026-09-25 14:23:51.478396	2026-09-25 14:23:51.478396
696	EFB-PLANT	card_valve_press_4_steam	MONITOR	69	2026-09-25 14:23:51.478658	2026-09-25 14:23:51.478658
697	EFB-PLANT	efb4_card	V_STEAM	69	2026-09-25 14:23:51.478909	2026-09-25 14:23:51.478909
698	EFB-PLANT	efb_no_4	V_STEAM	69	2026-09-25 14:23:51.479338	2026-09-25 14:23:51.479338
699	EFB-PLANT	efb_no_4	STEAM	69	2026-09-25 14:23:51.47986	2026-09-25 14:23:51.47986
414	EFB-PLANT	valve_press_1_steam	STEAM	69	2026-09-25 10:07:37.07963	2026-09-25 14:23:25.531955
416	EFB-PLANT	valve_press_1_steam	STATUS	69	2026-09-25 10:07:37.082	2026-09-25 14:23:25.532864
328	EFB-PLANT	efb_no_1	LOAD	39	2026-09-24 11:15:31.426859	2026-09-24 11:15:36.943105
330	EFB-PLANT	single_efb_1_press	LOAD	39	2026-09-24 11:15:31.431098	2026-09-24 11:15:36.943666
331	EFB-PLANT	single_efb_1	LOAD	39	2026-09-24 11:15:31.432249	2026-09-24 11:15:36.944106
336	EFB-PLANT	efb_no_1	PV	38	2026-09-24 11:15:36.944589	2026-09-24 11:15:36.945056
338	EFB-PLANT	single_efb_1_press	PV	38	2026-09-24 11:15:36.945963	2026-09-24 11:15:36.945963
339	EFB-PLANT	single_efb_1	PV	38	2026-09-24 11:15:36.947102	2026-09-24 11:15:36.947102
340	EFB-PLANT	calib_amp1	MAX	38	2026-09-24 11:36:35.983403	2026-09-24 11:36:35.983403
417	EFB-PLANT	valve_press_1_steam	MONITOR	69	2026-09-25 10:07:37.083011	2026-09-25 14:23:25.533601
418	EFB-PLANT	valve_press_1_steam_single	STEAM	69	2026-09-25 10:07:37.083847	2026-09-25 14:23:25.534316
419	EFB-PLANT	valve_press_1_steam_single	STATUS	69	2026-09-25 10:07:37.084711	2026-09-25 14:23:25.534811
420	EFB-PLANT	card_valve_press_1_steam	STEAM	69	2026-09-25 10:07:37.085536	2026-09-25 14:23:25.535501
421	EFB-PLANT	card_valve_press_1_steam	MONITOR	69	2026-09-25 10:07:37.086491	2026-09-25 14:23:25.536335
422	EFB-PLANT	efb1_card	V_STEAM	69	2026-09-25 10:07:37.087745	2026-09-25 14:23:25.537044
423	EFB-PLANT	efb_no_1	V_STEAM	69	2026-09-25 10:07:37.088918	2026-09-25 14:23:25.537655
424	EFB-PLANT	efb_no_1	STEAM	69	2026-09-25 10:07:37.089883	2026-09-25 14:23:25.538255
645	EFB-PLANT	valve_press_2_steam	STEAM	69	2026-09-25 14:23:34.541433	2026-09-25 14:23:34.543543
647	EFB-PLANT	valve_press_2_steam	STATUS	69	2026-09-25 14:23:34.544511	2026-09-25 14:23:34.544511
648	EFB-PLANT	valve_press_2_steam	MONITOR	69	2026-09-25 14:23:34.545223	2026-09-25 14:23:34.545223
649	EFB-PLANT	valve_press_2_steam_single	STEAM	69	2026-09-25 14:23:34.546109	2026-09-25 14:23:34.546109
650	EFB-PLANT	valve_press_2_steam_single	STATUS	69	2026-09-25 14:23:34.546867	2026-09-25 14:23:34.546867
651	EFB-PLANT	card_valve_press_2_steam	STEAM	69	2026-09-25 14:23:34.548026	2026-09-25 14:23:34.548026
652	EFB-PLANT	card_valve_press_2_steam	MONITOR	69	2026-09-25 14:23:34.551405	2026-09-25 14:23:34.551405
653	EFB-PLANT	efb2_card	V_STEAM	69	2026-09-25 14:23:34.552602	2026-09-25 14:23:34.552602
654	EFB-PLANT	efb_no_2	V_STEAM	69	2026-09-25 14:23:34.555982	2026-09-25 14:23:34.555982
655	EFB-PLANT	efb_no_2	STEAM	69	2026-09-25 14:23:34.556909	2026-09-25 14:23:34.556909
590	EFB-PLANT	valve_press_4_dilution	DILUTION	68	2026-09-25 11:55:30.350987	2026-09-25 14:23:47.586501
592	EFB-PLANT	valve_press_4_dilution	STATUS	68	2026-09-25 11:55:30.35413	2026-09-25 14:23:47.587551
593	EFB-PLANT	valve_press_4_dilution	MONITOR	68	2026-09-25 11:55:30.355078	2026-09-25 14:23:47.588288
594	EFB-PLANT	valve_press_4_dilution_single	DILUTION	68	2026-09-25 11:55:30.35633	2026-09-25 14:23:47.589055
595	EFB-PLANT	valve_press_4_dilution_single	STATUS	68	2026-09-25 11:55:30.357116	2026-09-25 14:23:47.589991
596	EFB-PLANT	card_valve_press_4_dilution	DILUTION	68	2026-09-25 11:55:30.357708	2026-09-25 14:23:47.590542
597	EFB-PLANT	card_valve_press_4_dilution	MONITOR	68	2026-09-25 11:55:30.358408	2026-09-25 14:23:47.591102
598	EFB-PLANT	efb4_card	V_DILUTION	68	2026-09-25 11:55:30.359053	2026-09-25 14:23:47.592052
599	EFB-PLANT	efb_no_4	V_DILUTION	68	2026-09-25 11:55:30.359517	2026-09-25 14:23:47.592585
600	EFB-PLANT	efb_no_4	DILUTION	68	2026-09-25 11:55:30.359959	2026-09-25 14:23:47.593217
\.


--
-- TOC entry 4964 (class 0 OID 29963)
-- Dependencies: 228
-- Data for Name: threshold_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.threshold_settings (id, parameter_key, lower_val, warning_val, danger_val, unit, updated_at) FROM stdin;
\.


--
-- TOC entry 4982 (class 0 OID 0)
-- Dependencies: 216
-- Name: logsheet_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.logsheet_entries_id_seq', 1, false);


--
-- TOC entry 4983 (class 0 OID 0)
-- Dependencies: 218
-- Name: plc_commands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plc_commands_id_seq', 1, false);


--
-- TOC entry 4984 (class 0 OID 0)
-- Dependencies: 221
-- Name: plc_devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plc_devices_id_seq', 4, true);


--
-- TOC entry 4985 (class 0 OID 0)
-- Dependencies: 225
-- Name: plc_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plc_tags_id_seq', 69, true);


--
-- TOC entry 4986 (class 0 OID 0)
-- Dependencies: 227
-- Name: station_event_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.station_event_logs_id_seq', 1, false);


--
-- TOC entry 4987 (class 0 OID 0)
-- Dependencies: 230
-- Name: station_tag_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.station_tag_mappings_id_seq', 699, true);


--
-- TOC entry 4988 (class 0 OID 0)
-- Dependencies: 229
-- Name: threshold_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.threshold_settings_id_seq', 1, false);


--
-- TOC entry 4774 (class 2606 OID 29979)
-- Name: logsheet_entries logsheet_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logsheet_entries
    ADD CONSTRAINT logsheet_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4776 (class 2606 OID 29981)
-- Name: plc_commands plc_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_commands
    ADD CONSTRAINT plc_commands_pkey PRIMARY KEY (id);


--
-- TOC entry 4778 (class 2606 OID 29983)
-- Name: plc_desired_state plc_desired_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_desired_state
    ADD CONSTRAINT plc_desired_state_pkey PRIMARY KEY (tag_id);


--
-- TOC entry 4780 (class 2606 OID 29985)
-- Name: plc_devices plc_devices_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_devices
    ADD CONSTRAINT plc_devices_ip_address_key UNIQUE (ip_address);


--
-- TOC entry 4782 (class 2606 OID 29987)
-- Name: plc_devices plc_devices_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_devices
    ADD CONSTRAINT plc_devices_name_key UNIQUE (name);


--
-- TOC entry 4784 (class 2606 OID 29989)
-- Name: plc_devices plc_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_devices
    ADD CONSTRAINT plc_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 4786 (class 2606 OID 29991)
-- Name: plc_tag_latest plc_tag_latest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_tag_latest
    ADD CONSTRAINT plc_tag_latest_pkey PRIMARY KEY (tag_id);


--
-- TOC entry 4788 (class 2606 OID 29993)
-- Name: plc_tags plc_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_tags
    ADD CONSTRAINT plc_tags_pkey PRIMARY KEY (id);


--
-- TOC entry 4790 (class 2606 OID 29995)
-- Name: plc_tags plc_tags_tag_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_tags
    ADD CONSTRAINT plc_tags_tag_name_key UNIQUE (tag_name);


--
-- TOC entry 4792 (class 2606 OID 29997)
-- Name: station_event_logs station_event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_event_logs
    ADD CONSTRAINT station_event_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4802 (class 2606 OID 37803)
-- Name: station_parameters station_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_parameters
    ADD CONSTRAINT station_parameters_pkey PRIMARY KEY (param_key);


--
-- TOC entry 4798 (class 2606 OID 37793)
-- Name: station_tag_mappings station_tag_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_tag_mappings
    ADD CONSTRAINT station_tag_mappings_pkey PRIMARY KEY (id);


--
-- TOC entry 4794 (class 2606 OID 29999)
-- Name: threshold_settings threshold_settings_parameter_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_settings
    ADD CONSTRAINT threshold_settings_parameter_key_key UNIQUE (parameter_key);


--
-- TOC entry 4796 (class 2606 OID 30001)
-- Name: threshold_settings threshold_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_settings
    ADD CONSTRAINT threshold_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4800 (class 2606 OID 37795)
-- Name: station_tag_mappings uk_station_mapping; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_tag_mappings
    ADD CONSTRAINT uk_station_mapping UNIQUE (station, equipment, signal_key);


--
-- TOC entry 4803 (class 2606 OID 30002)
-- Name: plc_commands fk_plc_commands_tag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_commands
    ADD CONSTRAINT fk_plc_commands_tag FOREIGN KEY (tag_id) REFERENCES public.plc_tags(id) ON DELETE CASCADE;


--
-- TOC entry 4804 (class 2606 OID 30007)
-- Name: plc_desired_state fk_plc_desired_state_tag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_desired_state
    ADD CONSTRAINT fk_plc_desired_state_tag FOREIGN KEY (tag_id) REFERENCES public.plc_tags(id) ON DELETE CASCADE;


--
-- TOC entry 4805 (class 2606 OID 30012)
-- Name: plc_tag_latest fk_plc_tag_latest_tag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_tag_latest
    ADD CONSTRAINT fk_plc_tag_latest_tag FOREIGN KEY (tag_id) REFERENCES public.plc_tags(id) ON DELETE CASCADE;


--
-- TOC entry 4806 (class 2606 OID 30017)
-- Name: plc_tag_values fk_plc_tag_values_tag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_tag_values
    ADD CONSTRAINT fk_plc_tag_values_tag FOREIGN KEY (tag_id) REFERENCES public.plc_tags(id) ON DELETE CASCADE;


--
-- TOC entry 4807 (class 2606 OID 30022)
-- Name: plc_tags fk_plc_tags_plc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plc_tags
    ADD CONSTRAINT fk_plc_tags_plc FOREIGN KEY (plc_id) REFERENCES public.plc_devices(id) ON DELETE CASCADE;


-- Completed on 2026-09-26 09:48:13

--
-- PostgreSQL database dump complete
--

-- Completed on 2026-09-26 09:48:13

--
-- PostgreSQL database cluster dump complete
--

