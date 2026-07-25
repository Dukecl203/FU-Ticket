import React, { useState, useEffect } from "react";
import { Select, Input, Space } from "antd";
import { EnvironmentOutlined, GlobalOutlined } from "@ant-design/icons";
import "./LocationSelector.scss";

const { Option } = Select;

// FPT University locations with coordinates
const FPT_LOCATIONS = [
  {
    value: "fpt_hanoi",
    label: "FPT University Hà Nội",
    coordinates: { lat: 21.0285, lng: 105.8542 },
    address: "Đường D1, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội",
  },
  {
    value: "fpt_danang",
    label: "FPT University Đà Nẵng",
    coordinates: { lat: 16.0471, lng: 108.2068 },
    address: "Khu Đô thị FPT City, Đà Nẵng",
  },
  {
    value: "fpt_hcm",
    label: "FPT University TP. Hồ Chí Minh",
    coordinates: { lat: 10.8415, lng: 106.8101 },
    address: "Khu Công nghệ cao, Quận 9, TP. Hồ Chí Minh",
  },
  {
    value: "fpt_cantho",
    label: "FPT University Cần Thơ",
    coordinates: { lat: 10.0452, lng: 105.7469 },
    address: "Khu Công nghệ cao, Cần Thơ",
  },
  {
    value: "fpt_binhdinh",
    label: "FPT University Bình Định",
    coordinates: { lat: 13.7563, lng: 109.2237 },
    address: "Khu Công nghệ cao, Bình Định",
  },
];

const LocationSelector = ({
  value,
  onChange,
  placeholder = "Chọn địa điểm",
}) => {
  const [locationType, setLocationType] = useState("fpt");
  const [customLocation, setCustomLocation] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [campusSpecificLocation, setCampusSpecificLocation] = useState("");

  // Initialize location type based on current value
  useEffect(() => {
    if (value) {
      const isFPTLocation = FPT_LOCATIONS.some(
        (loc) => value.includes(loc.label) || value.includes(loc.address)
      );
      const isOnlineLocation =
        value.toLowerCase().includes("online") ||
        value.toLowerCase().includes("trực tuyến");

      if (isOnlineLocation) {
        setLocationType("online");
        setCustomLocation(value);
      } else if (isFPTLocation) {
        setLocationType("fpt");
        // Parse campus and specific location from value
        const campus = FPT_LOCATIONS.find((loc) => value.includes(loc.label));
        if (campus) {
          setSelectedCampus(campus.value);
          // Remove campus info and leading comma to get specific location
          let specificLocation = value
            .replace(`${campus.label} - ${campus.address}`, "")
            .trim();

          // Remove leading comma if exists
          if (specificLocation.startsWith(",")) {
            specificLocation = specificLocation.substring(1).trim();
          }

          if (specificLocation && specificLocation !== "") {
            setCampusSpecificLocation(specificLocation);
          }
        }
      } else {
        setLocationType("custom");
        setCustomLocation(value);
      }
    }
  }, [value]);

  const handleLocationTypeChange = (type) => {
    setLocationType(type);
    if (type === "custom") {
      onChange?.(customLocation);
    } else if (type === "online") {
      onChange?.("Link Trực tuyến (Online)");
    }
  };

  const handleFPTLocationChange = (locationValue) => {
    const location = FPT_LOCATIONS.find((loc) => loc.value === locationValue);
    if (location) {
      setSelectedCampus(locationValue);
      const fullLocation = `${location.label} - ${location.address}`;
      onChange?.(fullLocation);
    }
  };

  const handleCampusSpecificLocationChange = (e) => {
    const specificLocation = e.target.value;
    setCampusSpecificLocation(specificLocation);

    if (selectedCampus) {
      const campus = FPT_LOCATIONS.find((loc) => loc.value === selectedCampus);
      if (campus) {
        // Only add comma and specific location if user actually typed something
        const fullLocation =
          specificLocation && specificLocation.trim()
            ? `${campus.label} - ${campus.address}, ${specificLocation.trim()}`
            : `${campus.label} - ${campus.address}`;
        onChange?.(fullLocation);
      }
    }
  };

  const handleCustomLocationChange = (e) => {
    const newValue = e.target.value;
    setCustomLocation(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="location-selector">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Select
          value={locationType}
          onChange={handleLocationTypeChange}
          className="location-type-select"
          style={{ width: "100%" }}
        >
          <Option value="fpt">FPT University Campus</Option>
          <Option value="online">Trực tuyến (Online)</Option>
          <Option value="custom">Địa điểm tùy chỉnh</Option>
        </Select>

        {locationType === "fpt" ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Select
              title="select campus"
              value={selectedCampus}
              onChange={handleFPTLocationChange}
              placeholder="Chọn campus FPT"
              className="fpt-location-select"
              style={{ width: "100%" }}
            >
              {FPT_LOCATIONS.map((location) => (
                <Option
                  key={location.value}
                  value={location.value}
                  title={`select campus ${location.value}`}
                >
                  <Space>
                    <EnvironmentOutlined />
                    <span>{location.label}</span>
                  </Space>
                </Option>
              ))}
            </Select>
            {selectedCampus && (
              <Input
                value={campusSpecificLocation}
                onChange={handleCampusSpecificLocationChange}
                placeholder="Vị trí cụ thể trong campus (VD: Tòa nhà A, Phòng 101, Sảnh chính...)"
                prefix={<EnvironmentOutlined />}
                className="campus-specific-location"
                style={{ width: "100%" }}
              />
            )}
          </Space>
        ) : locationType === "online" ? (
          <Input
            value={customLocation}
            onChange={handleCustomLocationChange}
            placeholder="Nhập thông tin sự kiện trực tuyến (VD: Zoom, Google Meet, Teams...)"
            prefix={<GlobalOutlined />}
            className="online-location-input"
            style={{ width: "100%" }}
          />
        ) : (
          <Input
            value={customLocation}
            onChange={handleCustomLocationChange}
            placeholder="Nhập địa điểm tùy chỉnh"
            prefix={<EnvironmentOutlined />}
            style={{ width: "100%" }}
          />
        )}
      </Space>
    </div>
  );
};

export default LocationSelector;
