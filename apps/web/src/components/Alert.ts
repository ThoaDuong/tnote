import Swal from 'sweetalert2';
import './Alert.css';

export const Alert = {
  // Toast notifications for success
  successToast: (title: string) => {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: title,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'custom-swal-popup',
        icon: 'custom-swal-icon',
        title: 'custom-swal-title',
      },
    });
  },

  // Modal alerts for warnings/errors
  error: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonColor: '#7C3AED',
      heightAuto: false,
      scrollbarPadding: false,
      customClass: {
        popup: 'custom-swal-popup',
        icon: 'custom-swal-icon',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-content',
      },
    });
  },

  // Generic info modal
  info: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'info',
      title: title,
      text: text,
      confirmButtonColor: '#7C3AED',
      heightAuto: false,
      scrollbarPadding: false,
      customClass: {
        popup: 'custom-swal-popup',
        icon: 'custom-swal-icon',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-content',
      },
    });
  }
};
