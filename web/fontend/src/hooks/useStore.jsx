import { useState, useEffect } from "react";

export function useStore() {
  const [dataUser, setDataUser] = useState(() => {
    // Khi load lần đầu, đọc user từ localStorage
    const savedUser = localStorage.getItem("loggedUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    // Mỗi khi dataUser thay đổi, cập nhật lại localStorage
    if (dataUser) {
      localStorage.setItem("loggedUser", JSON.stringify(dataUser));
    } else {
      localStorage.removeItem("loggedUser");
    }
  }, [dataUser]);

  return { dataUser, setDataUser };
}
