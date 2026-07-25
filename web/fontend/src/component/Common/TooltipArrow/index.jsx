import { Tooltip } from "antd";
import { useRef } from "react";
import cn from "../../../lib/classnames";

export default function TooltipArrow(props) {
  const {
    children,
    title,
    maxWidth = 200,
    placement = "top",
    overlayClassName,
    lineClamp,
    truncateNumber,
    lineWidth,
    keepHtml,
    styleWrapper,
    isShow,
    setShow,
  } = props;

  const contentRef = useRef(null);

  // Nếu không có title, không hiển thị tooltip
  if (!title) {
    return children;
  }

  return (
    <Tooltip
      placement={placement}
      title={title}
      overlayClassName={cn("custom-tooltip", overlayClassName)}
    >
      <div ref={contentRef} style={{ display: "inline-block" }}>
        {children}
      </div>
    </Tooltip>
  );
}
