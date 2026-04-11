import Swal from 'sweetalert2';

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
    });
  },

  // Modal alerts for warnings/errors
  error: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonColor: '#7C3AED',
    });
  },

  // Generic info modal
  info: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'info',
      title: title,
      text: text,
      confirmButtonColor: '#7C3AED',
    });
  }
};
