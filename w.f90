module weather_mod
    use iso_c_binding
contains

    !====================
    ! Compute mean of an array
    !====================
    function mean_sub(arr, n) result(mean) bind(C, name="mean_sub")
        real(c_double), intent(in) :: arr(*)
        integer(c_int), value :: n
        real(c_double) :: mean
        integer :: i
        mean = 0.0_c_double
        do i = 1, n
            mean = mean + arr(i)
        end do
        mean = mean / n
    end function mean_sub

    !====================
    ! Compute moving average with window w
    !====================
    subroutine moving_average(arr, n, w) bind(C, name="moving_average")
        use iso_c_binding
        implicit none
        real(c_double), intent(inout) :: arr(*)
        integer(c_int), value :: n, w
        integer :: i, j
        real(c_double) :: sum
        integer, parameter :: MAX_SIZE = 1000
        real(c_double) :: temp(MAX_SIZE)  ! fixed-size temp array

        ! Ensure n does not exceed MAX_SIZE
        if (n > MAX_SIZE) then
            return
        end if

        ! Compute moving average
        do i = 1, n
            sum = 0.0_c_double
            do j = max(1, i-w+1), i
                sum = sum + arr(j)
            end do
            temp(i) = sum / min(i, w)
        end do

        ! Copy temp back to arr element-wise (no slicing)
        do i = 1, n
            arr(i) = temp(i)
        end do

    end subroutine moving_average

    !====================
    ! Simple linear regression (y = a*x + b)
    !====================
    subroutine linear_regression(x, y, n, a, b) bind(C, name="linear_regression")
        real(c_double), intent(in) :: x(*), y(*)
        integer(c_int), value :: n
        real(c_double), intent(out) :: a, b
        integer :: i
        real(c_double) :: sumx, sumy, sumxy, sumxx, denom

        sumx = 0.0_c_double
        sumy = 0.0_c_double
        sumxy = 0.0_c_double
        sumxx = 0.0_c_double

        do i = 1, n
            sumx = sumx + x(i)
            sumy = sumy + y(i)
            sumxy = sumxy + x(i)*y(i)
            sumxx = sumxx + x(i)*x(i)
        end do

        denom = n*sumxx - sumx*sumx

        if (denom == 0.0_c_double) then
            ! All x are the same, slope undefined -> set slope=0
            a = 0.0_c_double
            b = sumy / n
        else
            a = (n*sumxy - sumx*sumy) / denom
            b = (sumy - a*sumx) / n
        end if
    end subroutine linear_regression

end module weather_mod
